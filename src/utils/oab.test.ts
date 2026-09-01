import { describe, expect, it } from "vitest";

import { erroDaInscricao, normalizarInscricao, partesDaInscricao } from "./oab";

/** A régua da inscrição, extraída de `erroDaBusca` quando o perfil passou a
 * cadastrar a própria OAB.
 *
 * 🔴 O que estes testes protegem não é a validação em si -- é a DIFERENÇA
 * entre os dois usos. Uma régua só, com um comportamento que muda de tela, é
 * exatamente onde uma cópia divergiria em silêncio.
 */
describe("erroDaInscricao", () => {
  describe("as duas partes andam juntas", () => {
    it("aceita número e UF", () => {
      expect(erroDaInscricao("148502", "MG", { obrigatoria: true })).toBeNull();
      expect(erroDaInscricao("148502", "MG", { obrigatoria: false })).toBeNull();
    });

    it("recusa número sem UF", () => {
      /* A mesma numeração existe nas 27 seccionais: número sem UF não
         identifica ninguém, e o servidor recusa. */
      expect(erroDaInscricao("148502", "", { obrigatoria: false })).toEqual({
        campo: "ufOab",
        mensagem: "Selecione a UF da OAB",
      });
    });

    it("recusa UF sem número", () => {
      expect(erroDaInscricao("", "MG", { obrigatoria: false })).toEqual({
        campo: "numeroOab",
        mensagem: "Informe o número da OAB",
      });
    });
  });

  describe("🔴 as duas vazias significam coisas diferentes em cada tela", () => {
    it("no PERFIL é válido -- é assim que se limpa a inscrição", () => {
      /* Sem isto, quem cadastrou uma OAB por engano não teria como apagá-la:
         o formulário recusaria o único estado que significa "não tenho". */
      expect(erroDaInscricao("", "", { obrigatoria: false })).toBeNull();
    });

    it("na BUSCA é erro -- não há o que buscar", () => {
      expect(erroDaInscricao("", "", { obrigatoria: true })).toEqual({
        campo: "numeroOab",
        mensagem: "Informe o número da OAB",
      });
    });
  });

  describe("o número é só de dígitos", () => {
    it.each(["abc", "26 3", "-1", "148.502", "148502a"])("recusa %j", (numero) => {
      /* Espelha `oab.normalizar` no servidor: uma inscrição que não é dígito
         seria consultada no PJe a cada ciclo, para sempre, casando com nada. */
      expect(erroDaInscricao(numero, "MG", { obrigatoria: false })).toEqual({
        campo: "numeroOab",
        mensagem: "O número da OAB tem só dígitos",
      });
    });

    it("aceita zeros à esquerda", () => {
      /* ⚠️ Não normaliza nem apara zero: quem manda no formato é o tribunal,
         e "corrigir" aqui faria a inscrição deixar de casar com a de lá. */
      expect(erroDaInscricao("000263", "MG", { obrigatoria: false })).toBeNull();
    });
  });

  describe("espaços", () => {
    it("ignora espaço em volta, dos dois lados", () => {
      expect(erroDaInscricao("  148502  ", "  MG  ", { obrigatoria: true })).toBeNull();
    });

    it("só espaço conta como vazio", () => {
      /* ⚠️ Sem o `trim`, `"   "` passaria por "preenchido" e o servidor
         devolveria 400 para quem parecia ter digitado algo. */
      expect(erroDaInscricao("   ", "   ", { obrigatoria: false })).toBeNull();
      expect(erroDaInscricao("   ", "   ", { obrigatoria: true })).toEqual({
        campo: "numeroOab",
        mensagem: "Informe o número da OAB",
      });
    });
  });
});

/** As duas metades da conversão que a lista de inscrições do grupo exige.
 *
 * 🔴 Elas existem porque o servidor é ASSIMÉTRICO: o `GET` devolve
 * `"263/MG"` e o `PATCH` pede `numero` e `uf` separados. Toda gravação da
 * lista passa por `partesDaInscricao` -- inclusive nas inscrições que a pessoa
 * nem tocou --, então um erro aqui reescreve dado que ninguém pediu para
 * mexer.
 */
describe("normalizarInscricao", () => {
  it("junta na forma canônica, com a UF em caixa alta", () => {
    expect(normalizarInscricao("263", "mg")).toBe("263/MG");
  });

  it("apara o espaço das duas partes", () => {
    /* 🔴 O par que importa: sem o `trim`, `" 263 "` digitado com espaço não
       casaria com o `"263/MG"` gravado, e a tela deixaria cadastrar a
       repetida -- que o servidor então ignoraria em silêncio. */
    expect(normalizarInscricao(" 263 ", " mg ")).toBe("263/MG");
  });

  it("NÃO tira zero à esquerda -- `0263` e `263` são inscrições diferentes", () => {
    /* O par negativo da normalização: "canônica" aqui é só maiúscula e
       espaço. Achar que ela normaliza o número faria a tela recusar como
       repetida uma inscrição que o servidor aceita como outra. */
    expect(normalizarInscricao("0263", "MG")).toBe("0263/MG");
    expect(normalizarInscricao("0263", "MG")).not.toBe(normalizarInscricao("263", "MG"));
  });
});

describe("partesDaInscricao", () => {
  it("reparte a forma canônica", () => {
    expect(partesDaInscricao("263/MG")).toEqual({ numero: "263", uf: "MG" });
  });

  it("corta na PRIMEIRA barra -- a sobra fica na UF", () => {
    /* 🔴 A mutação que este teste mata: trocar por `split("/")` e pegar
       `[0]`/`[1]`. Com `"263/M/G"` -- que só entraria por escrita direta no
       banco -- aquele devolveria `uf: "M"`, uma inscrição DIFERENTE, gravada
       sem nada na tela dizendo. Aqui a sobra vai junto e o servidor recusa,
       que é o desfecho alto. */
    expect(partesDaInscricao("263/M/G")).toEqual({ numero: "263", uf: "M/G" });
  });

  it("sem barra, tudo é o número e a UF fica vazia", () => {
    expect(partesDaInscricao("263")).toEqual({ numero: "263", uf: "" });
  });

  it("volta ao ponto de partida: normalizar(repartir(x)) === x", () => {
    /* A concordância entre as duas: elas são as duas pontas da MESMA
       conversão, e uma testada sem a outra passaria com as duas erradas do
       mesmo jeito. */
    const canonica = "148502/MG";
    const { numero, uf } = partesDaInscricao(canonica);
    expect(normalizarInscricao(numero, uf)).toBe(canonica);
  });
});
