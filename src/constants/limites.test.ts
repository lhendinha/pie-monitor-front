import { describe, expect, it } from "vitest";

describe("teto de campo não se escreve à mão", () => {
  /**
   * 🔴 Cada formulário escrevia o próprio número, e por isso eles
   * discordavam. O nome do cliente é o caso que fecha o argumento:
   *
   *   criar  -> sem `maxLength` nenhum
   *   editar -> `maxLength={256}`
   *   API    -> aceita 512
   *
   * Três respostas para a mesma pergunta, no mesmo campo. Quem cadastrasse
   * uma razão social longa passava pela criação e não conseguia corrigi-la
   * depois; quem tentasse editar batia numa parede invisível na metade do
   * que o sistema permite -- sem mensagem nenhuma, porque `maxLength` não
   * avisa, só para de aceitar tecla.
   *
   * A varredura é por LITERAL, e não por campo: um número solto num
   * `maxLength` já é a duplicata, tenha ele nome ou não do outro lado.
   */
  it("nenhum `maxLength` recebe número cru", () => {
    const fontes = import.meta.glob("../**/*.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    const achados: string[] = [];
    for (const [arquivo, fonte] of Object.entries(fontes)) {
      if (/\.test\.tsx$/.test(arquivo)) continue;
      for (const m of fonte.matchAll(/maxLength=\{(\d+)\}/g)) {
        achados.push(`${arquivo}: maxLength={${m[1]}}`);
      }
    }

    expect(achados, "importe de `constants/limites.ts` (ou leia do servidor)").toEqual([]);
  });

  /**
   * ⚠️ Controle do teste acima: sem isto, apagar TODOS os `maxLength` do
   * projeto também deixaria a lista vazia e o teste verde -- provando o
   * contrário do que ele quer provar.
   */
  it("e os campos continuam TENDO teto", () => {
    const fontes = import.meta.glob("../**/*.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    const comTeto = Object.entries(fontes).filter(
      ([arquivo, fonte]) => !/\.test\.tsx$/.test(arquivo) && fonte.includes("maxLength="),
    );

    expect(comTeto.length).toBeGreaterThanOrEqual(9);
  });
});
