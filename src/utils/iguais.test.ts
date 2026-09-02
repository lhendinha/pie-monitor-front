import { describe, expect, it } from "vitest";

import { mesmoValor } from "./iguais";

/** A régua de igualdade da guarda de descarte.
 *
 * 🔴 **Estes testes NÃO vêm de graça de `camposAlterados`.** Aquele arquivo
 * tem `if (depois === undefined) continue` ANTES da comparação, com semântica
 * OPOSTA à daqui: lá, um valor que virou `undefined` significa "não mexer";
 * aqui, significa mudança. Os testes de `processos.test.ts` guardam o
 * chamador, não esta função -- e só exercitam `string` e `string[]`.
 */
describe("mesmoValor", () => {
  // ── primitivos ──────────────────────────────────────────────────────────

  it.each([
    ["", ""],
    ["Ana", "Ana"],
    [0, 0],
    [true, true],
    [null, null],
    [undefined, undefined],
  ])("iguais: %s e %s", (a, b) => {
    expect(mesmoValor(a, b)).toBe(true);
  });

  it("🔴 `null` NÃO é `\"\"`, e não há coerção", () => {
    /* Quem precisa que os dois signifiquem a mesma coisa normaliza na
       PROJEÇÃO, no formulário. Coagir aqui esconderia a diferença de quem
       depende dela -- e é justamente essa normalização explícita que evita o
       falso "alterado" quando um campo opcional nasce ausente e vira "". */
    expect(mesmoValor(null, "")).toBe(false);
    expect(mesmoValor(undefined, "")).toBe(false);
    expect(mesmoValor(null, undefined)).toBe(false);
  });

  it('"1" não é 1 -- texto e número são valores distintos', () => {
    expect(mesmoValor("1", 1)).toBe(false);
  });

  it("⚠️ `NaN` é igual a `NaN` -- é por isto que é `Object.is` e não `===`", () => {
    /* Com `===`, um campo numérico que virou `NaN` ficaria "alterado" para
       sempre e a pessoa não conseguiria mais fechar o modal. */
    expect(mesmoValor(NaN, NaN)).toBe(true);
  });

  // ── listas ──────────────────────────────────────────────────────────────

  it("lista igual, mesmo sendo outra instância", () => {
    expect(mesmoValor(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("🔴 lista REORDENADA conta como mudança", () => {
    /* O mais seguro dos dois erros, e a razão está escrita em
       `camposAlterados`: mandar de volta o que já está lá é inócuo, deixar de
       mandar o que mudou perde a edição. */
    expect(mesmoValor(["a", "b"], ["b", "a"])).toBe(false);
  });

  it("tamanho diferente é diferente, mesmo com prefixo igual", () => {
    /* O par que mata um `every` sem checagem de tamanho: `["a"].every(...)`
       contra `["a","b"]` devolveria `true`. */
    expect(mesmoValor(["a"], ["a", "b"])).toBe(false);
    expect(mesmoValor(["a", "b"], ["a"])).toBe(false);
  });

  it("lista vazia é igual a lista vazia, e diferente de ausente", () => {
    expect(mesmoValor([], [])).toBe(true);
    expect(mesmoValor([], undefined)).toBe(false);
  });

  it("lista contra escalar é diferente", () => {
    expect(mesmoValor(["a"], "a")).toBe(false);
    expect(mesmoValor("a", ["a"])).toBe(false);
  });

  // ── File ────────────────────────────────────────────────────────────────

  it("🔴 `File` compara por IDENTIDADE", () => {
    /* O que a guarda precisa saber é "tem arquivo ou não". Escolher o mesmo
       arquivo de novo gera instância nova -- e nos dois casos o veredito é o
       mesmo: saiu de `null`, logo a pessoa mexeu. */
    const arquivo = new File(["x"], "peticao.pdf", { type: "application/pdf" });
    const gemeo = new File(["x"], "peticao.pdf", { type: "application/pdf" });

    expect(mesmoValor(arquivo, arquivo)).toBe(true);
    expect(mesmoValor(arquivo, gemeo)).toBe(false);
    expect(mesmoValor(arquivo, null)).toBe(false);
    expect(mesmoValor(null, null)).toBe(true);
  });
});
