import { describe, expect, it } from "vitest";

import { TIPO_SESSAO_ALTERADA } from "../constants";
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
    expect(frasePrincipal(BASE, (e) => e)).toBe(
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
