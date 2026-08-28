import { describe, expect, it } from "vitest";

/** 🔴 Toda célula da tabela do sistema carrega a medida de `.tbl td`.
 *
 * O cabeçalho de `Tabela` tem 14px de recuo horizontal (`p="0 14px 10px"`).
 * Uma `Table.Cell` crua vem com o padding padrão do Chakra, então o valor
 * NÃO nasce embaixo do título da coluna -- e, sem `borderBottom`, a
 * divisória da linha some naquela coluna.
 *
 * ⚠️ **Segunda ocorrência do mesmo defeito.** `LinhaProcesso` já registra no
 * comentário da coluna de prazo: *"uma `Table.Cell` crua aqui ficava sem a
 * divisória e sem o padding de `.tbl td`, e a coluna toda desalinhava nas
 * linhas sem prazo"*. Ele voltou na prévia da importação, nas colunas de
 * marcar, tribunal, comunicações e situação. Defeito que reaparece vira
 * guarda.
 *
 * ⚠️ **Guarda de FORMA**, no molde do `test_a_reserva_e_UMA_escrita_atomica`
 * da API: o que ele checa é o texto do código, porque o efeito é de CSS e o
 * jsdom não calcula estilo -- `getComputedStyle` devolveria vazio e o teste
 * passaria com a tabela torta. Quem vê o desalinhamento é o Chrome; o que
 * este teste impede é a REGRESSÃO chegar lá.
 *
 * ⚠️ Lê os arquivos por `import.meta.glob` do Vite, e não por `node:fs`: o
 * `tsconfig` do front não carrega os tipos do Node, e um teste que não passa
 * no `tsc` quebra a checagem de tipos do projeto inteiro.
 */

/** Os fontes de componente, crus. `eager` porque o teste é síncrono. */
const FONTES = import.meta.glob("/src/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** As duas medidas que fazem a célula alinhar com o cabeçalho e fechar a
 * linha. Iguais às de `CelulaComSub`. */
const PADDING = 'p="13px 14px"';
const DIVISORIA = 'borderBottomColor="border.subtle"';

/** ⚠️ O próprio componente é onde a medida MORA -- ele não pode se cobrar.
 * E os `.test.tsx` ficam de fora: teste que monta uma célula à mão para
 * verificar outra coisa não precisa carregar a medida junto. */
const arquivos = Object.entries(FONTES).filter(
  ([caminho]) =>
    caminho !== "/src/components/CelulaComSub/index.tsx" && !caminho.endsWith(".test.tsx"),
);

/** As aberturas `<Table.Cell ...>` de um arquivo, cada uma com seus
 * atributos -- o que vai da tag até o `>` que a fecha. */
function aberturasDeCelula(codigo: string): string[] {
  return [...codigo.matchAll(/<Table\.Cell\b([^>]*)>/g)].map((m) => m[1]);
}

describe("a medida da célula de tabela", () => {
  it("varre a árvore de verdade -- senão o guarda passaria vazio", () => {
    /* 🔴 O par que impede o falso "passou": um padrão de glob errado
       devolveria zero arquivo e as asserções abaixo não rodariam. */
    expect(arquivos.length).toBeGreaterThan(50);
    expect(arquivos.some(([c]) => c.endsWith("/LinhaProcesso/index.tsx"))).toBe(true);
    expect(
      arquivos.filter(([, codigo]) => aberturasDeCelula(codigo).length).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    ["o padding que alinha com o cabeçalho", PADDING],
    ["a divisória que fecha a linha", DIVISORIA],
  ])("toda `Table.Cell` declara %s", (_o_que, medida) => {
    const faltando = arquivos.flatMap(([caminho, codigo]) =>
      aberturasDeCelula(codigo)
        .filter((atributos) => !atributos.includes(medida))
        .map(() => caminho),
    );

    expect(faltando, `use \`CelulaComSub\` ou declare ${medida} nestas células`).toEqual([]);
  });
});
