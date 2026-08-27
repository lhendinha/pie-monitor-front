import { describe, expect, it } from "vitest";

import {
  erroDaBusca,
  resumoDaImportacao,
  rotuloDeImportar,
  selecionaveis,
} from "./importacao";
import type { ProcessoEncontrado } from "../types";

function achado(numero: string, ja_existe = false): ProcessoEncontrado {
  return { numero_processo: numero, apelido: "Execução Fiscal", comunicacoes: 3, ja_existe };
}

describe("o que impede a busca de sair", () => {
  it("aceita o caminho comum", () => {
    expect(erroDaBusca("123456", "RS", "", "")).toBeNull();
  });

  it("exige o número da OAB", () => {
    expect(erroDaBusca("", "RS", "", "")).toEqual({
      campo: "numeroOab", mensagem: "Informe o número da OAB",
    });
    expect(erroDaBusca("   ", "RS", "", "")?.campo).toBe("numeroOab");
  });

  it("exige que o número seja só dígitos", () => {
    expect(erroDaBusca("12A456", "RS", "", "")?.mensagem).toContain("só dígitos");
  });

  it("🔴 exige a UF -- ela sozinha não filtra nada", () => {
    /* Medido contra o PJe: mandar só a UF é o mesmo que mandar um parâmetro
       inventado, e vem a base inteira. Aceitar essa combinação cadastraria
       processos de outra pessoa. */
    const erro = erroDaBusca("123456", "", "", "");
    expect(erro?.mensagem).toBe("Selecione a UF da OAB");
    /* ⚠️ E o CAMPO é a UF, apesar de a frase citar as duas coisas -- é o que
       a primeira versão errava ao decidir por substring. */
    expect(erro?.campo).toBe("ufOab");
  });

  it("recusa período invertido", () => {
    const erro = erroDaBusca("123456", "RS", "2024-12-31", "2024-01-01");
    expect(erro?.mensagem).toContain("não pode ser posterior");
    expect(erro?.campo).toBe("periodo");
  });

  it.each([
    ["só o início", "2024-01-01", ""],
    ["só o fim", "", "2024-12-31"],
    ["intervalo normal", "2024-01-01", "2024-12-31"],
    ["futuro", "2030-01-01", "2030-12-31"],
  ])("aceita %s", (_, de, ate) => {
    expect(erroDaBusca("123456", "RS", de, ate)).toBeNull();
  });

  it("⚠️ data futura NÃO é erro", () => {
    /* Recusá-la inventaria uma regra para poupar a pessoa de um resultado
       vazio que a tela já sabe explicar -- e "de janeiro que vem" é um jeito
       legítimo de perguntar "tem algo novo?". */
    expect(erroDaBusca("123456", "RS", "2099-01-01", "")).toBeNull();
  });
});

describe("o que dá para marcar", () => {
  it("só os que ainda não estão no subgrupo", () => {
    /* Importar nunca sobrescreve: uma caixa que não faz nada é pior que uma
       caixa ausente. */
    const lista = [achado("1"), achado("2", true), achado("3")];

    expect(selecionaveis(lista)).toEqual(["1", "3"]);
  });

  it("lista sem nada novo devolve vazio", () => {
    expect(selecionaveis([achado("1", true)])).toEqual([]);
  });
});

describe("o rótulo do botão", () => {
  it("⚠️ singular de verdade com um", () => {
    /* "Importar 1 processos" é o erro que aparece só quando alguém testa com
       um item -- justamente o caso que ninguém testa à mão. */
    expect(rotuloDeImportar(1)).toBe("Importar 1 processo");
  });

  it("plural com mais de um", () => {
    expect(rotuloDeImportar(201)).toBe("Importar 201 processos");
  });

  it("sem número quando nada está marcado", () => {
    expect(rotuloDeImportar(0)).toBe("Importar");
  });
});

describe("o resumo depois de gravar", () => {
  it("o caso limpo", () => {
    expect(resumoDaImportacao({ cadastrados: 201, ja_existiam: 0, falharam: [] })).toBe(
      "201 processos importados",
    );
  });

  it("🔴 já existentes NÃO são contados como falha", () => {
    /* Alguém cadastrou pela tela entre a prévia e a confirmação, e o servidor
       recusou de propósito. Somar isso a `falharam` faria a tela acusar
       defeito onde o sistema funcionou como devia. */
    const frase = resumoDaImportacao({ cadastrados: 8, ja_existiam: 2, falharam: [] });

    expect(frase).toBe("8 processos importados · 2 já estavam aqui");
    expect(frase).not.toContain("não entr");
  });

  it("falhas aparecem separadas", () => {
    expect(
      resumoDaImportacao({ cadastrados: 5, ja_existiam: 1, falharam: ["a", "b"] }),
    ).toBe("5 processos importados · 1 já estava aqui · 2 não entraram");
  });

  it("singular em cada parte", () => {
    expect(resumoDaImportacao({ cadastrados: 1, ja_existiam: 1, falharam: ["x"] })).toBe(
      "1 processo importado · 1 já estava aqui · 1 não entrou",
    );
  });
});
