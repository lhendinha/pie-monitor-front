import { describe, expect, it } from "vitest";

import { erroDaInscricao } from "./oab";

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
