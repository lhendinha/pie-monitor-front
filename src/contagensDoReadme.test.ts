import { describe, expect, it } from "vitest";

/** 🔴 Os números que o README afirma sobre a árvore batem com a árvore.
 *
 * A seção "Estrutura" diz quantos componentes e quantas páginas existem. Em
 * 01/09/2026 ela dizia **55 componentes e 19 páginas** enquanto havia **65 e
 * 21** -- errada em dez e em duas, e ninguém tinha como saber: número em `.md`
 * não tem quem o cobre, e cada componente novo o afasta mais um.
 *
 * ⚠️ **Mentira em `.md` é pior que ausência**, porque quem lê confia. Uma
 * contagem que só envelhece ou vira guarda, ou sai do arquivo. Ficou, com este
 * guarda -- ela diz a ESCALA da biblioteca compartilhada, que é informação
 * real para quem chega.
 *
 * ⚠️ **Guarda de FORMA**, no molde de `CelulaComSub/celulaDeTabela.test.ts`: o
 * que ele lê é o TEXTO do README, porque o defeito é de texto. E, como lá, a
 * leitura é por `import.meta.glob` do Vite e não por `node:fs` -- o `tsconfig`
 * do front não carrega os tipos do Node, e um teste que não passa no `tsc`
 * quebra a checagem de tipos do projeto inteiro.
 */

const README = Object.values(
  import.meta.glob("/README.md", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >,
)[0];

/** As pastas de primeiro nível -- é o que a linha do README conta.
 *
 * ⚠️ `index.ts` E `index.tsx`: três componentes (`BotaoNu`, `BotaoQuadrado`,
 * `BotaoDeLink`) não têm JSX e por isso usam `.ts`. Contar só `.tsx` deixava o
 * guarda três abaixo da árvore -- e ele acusaria o README de mentir sobre um
 * número correto, que é a pior classe de guarda. */
function pastas(padrao: string): number {
  const arquivos = import.meta.glob("/src/**/index.{ts,tsx}", { eager: false });
  const raizes = new Set(
    Object.keys(arquivos)
      .map((c) => c.match(new RegExp(`^${padrao}/([^/]+)/index\\.tsx?$`))?.[1])
      .filter(Boolean),
  );
  return raizes.size;
}

describe("as contagens do README", () => {
  it("lê o README de verdade -- senão o guarda passaria vazio", () => {
    /* 🔴 O par que impede o falso "passou": um glob errado devolveria
       `undefined`, e as asserções abaixo não teriam o que reprovar. */
    expect(README).toContain("## Estrutura");
    expect(pastas("/src/components")).toBeGreaterThan(30);
    expect(pastas("/src/pages")).toBeGreaterThan(10);
  });

  it.each([
    ["components", "componentes gerais", "/src/components"],
    ["pages", "páginas", "/src/pages"],
  ])("o número de %s bate com a árvore", (_nome, rotulo, caminho) => {
    const dito = README.match(new RegExp(`-- (\\d+) ${rotulo}`))?.[1];
    expect(dito, `o README não diz mais "N ${rotulo}" -- o guarda ficou sem alvo`).toBeDefined();
    expect(Number(dito)).toBe(pastas(caminho));
  });
});
