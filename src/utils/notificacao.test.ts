import { describe, expect, it } from "vitest";

import { TIPO_PROCESSOS_ATRIBUIDOS, TIPO_SESSAO_ALTERADA } from "../constants";
import { destinoDaNotificacao, detalheSecundario, frasePrincipal } from "./notificacao";
import type { Notificacao } from "../types";

const BASE: Notificacao = {
  usuario_id: "eu@x.com",
  notificacao_id: "n1",
  tipo: TIPO_SESSAO_ALTERADA,
  criado_em: "2026-08-25T10:00:00Z",
  lida: false,
  autor: "",
  titulo: "Você foi movido para o grupo Escritório Novo",
  detalhe: "",
  subgrupo_id: "",
  alvo_tipo: "",
  alvo_id: "",
};

describe("notificação de sessão alterada", () => {
  it("a frase principal é o título, sem depender do front conhecer o tipo", () => {
    /* 🔴 O `default` de `frasePrincipal` devolve o título cru justamente pra
       um front mais antigo que o servidor não esconder o aviso. É por isso que
       a API manda a frase PRONTA em vez de um rótulo. */
    expect(frasePrincipal(BASE)).toBe(
      "Você foi movido para o grupo Escritório Novo",
    );
  });

  it("🔴 e a linha secundária fica VAZIA -- senão a frase aparece duas vezes", () => {
    /* A linha do sino renderiza `frasePrincipal` e `detalheSecundario` uma
       embaixo da outra, e o `default` das duas é o título. Sem o caso
       explícito, a mesma frase saía duplicada. */
    expect(detalheSecundario(BASE)).toBe("");
  });

  it("não é clicável: não aponta pra recurso nenhum", () => {
    expect(destinoDaNotificacao(BASE)).toBeNull();
  });
});

describe('os avisos de "quem responde, recebe" (26/08/2026)', () => {
  const COM = (extra: Partial<typeof BASE>) => ({ ...BASE, autor: "bruno@x.com", autor_nome: "Bruno", ...extra });

  it("diz que a pessoa passou a RESPONDER, não que recebeu uma tarefa", () => {
    /* ⚠️ A escolha da frase é o ponto: o que muda com a régua nova é de quem
       é a RESPONSABILIDADE, e é ela que decide quem recebe os avisos daquele
       item daqui pra frente. "Atribuiu uma tarefa" é outra coisa -- trabalho
       individual. */
    expect(frasePrincipal(COM({ tipo: "processo_atribuido" }))).toBe(
      "Bruno colocou você como responsável por um processo",
    );
    expect(frasePrincipal(COM({ tipo: "atendimento_atribuido" }))).toBe(
      "Bruno colocou você como responsável por um atendimento",
    );
  });

  it("no aviso de SAÍDA, a frase diz o que a pessoa perde", () => {
    /* "Removeu você da lista" soaria administrativo e esconderia a
       consequência: ela deixa de receber os avisos daquele processo. */
    expect(frasePrincipal(COM({ tipo: "processo_desatribuido" }))).toBe(
      "Bruno tirou você dos responsáveis por um processo",
    );
  });

  it("sem autor, a frase continua fazendo sentido", () => {
    /* O `autor` é opcional em todo tipo -- o lembrete vem do robô. Uma frase
       que só funciona com sujeito quebraria o dia em que um aviso vier sem
       ele. */
    expect(frasePrincipal({ ...BASE, tipo: "processo_atribuido" })).toBe(
      "Você passou a responder por um processo",
    );
  });

  it('documento vinculado fala no SINGULAR mesmo quando foram vários', () => {
    /* O servidor SUPRIME os repetidos por janela em vez de agrupar (o
       repositório não tem atualizar, e o Stream publica só INSERT -- um
       agrupamento por update não chegaria ao sino). Então este aviso
       representa um OU vários, e a contagem exata está na aba pra onde ele
       leva. */
    expect(frasePrincipal(COM({ tipo: "documento_vinculado" }))).toBe(
      "Bruno anexou um documento",
    );
  });

  it("o alvo `documento` leva pra tela do documento", () => {
    expect(
      destinoDaNotificacao({ ...BASE, alvo_tipo: "documento", alvo_id: "doc1", subgrupo_id: "sg1" }),
    ).toBe("/documentos/sg1/doc1");
  });

  it("🔴 tipo e alvo DESCONHECIDOS degradam sem quebrar -- é o que deixa a API subir antes", () => {
    /* A ordem do plano é API primeiro. Enquanto o front não subir, ele vai
       receber tipos que não conhece: a frase cai no título cru (o aviso
       aparece) e a linha não vira link (em vez de levar a lugar nenhum). */
    /* 🔴 Os dois `as` são deliberados, e o tipo continua fechado por causa
       deles -- não apesar.

       `Notificacao.tipo` e `alvo_tipo` são uniões fechadas: é o que faz o
       `switch` de `textoDaNotificacao` cobrar cada caso novo em tempo de
       compilação. Mas o cenário AQUI é o de um valor que o front ainda não
       conhece, vindo de uma API mais nova -- e isso não é hipótese: a ordem
       de deploy é API primeiro, então acontece a cada entrega.

       Sem o cast, este teste não compilaria, e a tentação seria apagá-lo --
       jogando fora justamente a prova de que a degradação é graciosa. */
    const futuro = {
      ...BASE,
      tipo: "coisa_que_ainda_nao_existe" as Notificacao["tipo"],
      titulo: "Algo aconteceu",
    };
    expect(frasePrincipal(futuro)).toBe("Algo aconteceu");
    expect(
      destinoDaNotificacao({
        ...futuro,
        alvo_tipo: "coisa_nova" as Notificacao["alvo_tipo"],
        alvo_id: "x",
      }),
    ).toBeNull();
  });
});

describe("atribuição em massa", () => {
  const EM_MASSA: Notificacao = {
    ...BASE,
    tipo: TIPO_PROCESSOS_ATRIBUIDOS,
    titulo: "201 processos atribuídos a você",
    autor: "Chefe",
    alvo_tipo: "processo",
    alvo_id: "",
  };

  it("mostra a contagem que veio do servidor, com quem fez", () => {
    /* 🔴 O título vem PRONTO da API porque só ela sabe quantos foram. O front
       não pode montar "N processos" -- ele não recebe a lista. */
    expect(frasePrincipal(EM_MASSA)).toBe("Chefe: 201 processos atribuídos a você");
  });

  it("sem autor, mostra só a contagem", () => {
    expect(frasePrincipal({ ...EM_MASSA, autor: "" })).toBe(
      "201 processos atribuídos a você",
    );
  });

  it("não é clicável enquanto o destino filtrado não existir", () => {
    /* ⚠️ Pendência conhecida, e o teste a fixa em vez de deixá-la implícita:
       o destino certo é a listagem filtrada por responsável, que hoje só se
       alcança por `state` de navegação -- e esta função devolve string.

       🔴 Se alguém resolver isso, ESTE teste cai -- e é assim que ele avisa
       que a pendência foi fechada, em vez de sobreviver mentindo. */
    expect(destinoDaNotificacao(EM_MASSA)).toBeNull();
  });
});
