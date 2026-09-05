/** O pacote `types/` continua um pacote: índice só reexporta, arquivos de
 * domínio não se importam em ciclo, e o total de tipos é o medido.
 *
 * 🔴 Sem a contagem, um tipo apagado num arquivo de domínio some do índice
 * em silêncio: `export type *` não acusa o que deixou de existir, e o
 * `tsc` só reclama onde alguém o usa. A contagem é a régua -- mudou o
 * número, mude o teste no mesmo commit, como `test_serializacao_entidades`
 * faz na API.
 *
 * ➡️ `PLANO_ARQUIVOS_MENORES.md`, Fase 1.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = join(process.cwd(), "src/types");
/** Os envelopes e corpos das rotas ficam fora do índice de propósito: quem
 * os usa importa `types/respostas` e `types/requisicoes` pelo caminho. */
const FORA_DO_INDICE = new Set(["index.ts", "respostas.ts", "requisicoes.ts"]);
const TIPOS_NO_PACOTE = 87;

const dominios = readdirSync(PASTA)
  .filter((a) => a.endsWith(".ts") && !FORA_DO_INDICE.has(a))
  .map((a) => a.replace(/\.ts$/, ""))
  .sort();

function fonte(nome: string): string {
  return readFileSync(join(PASTA, `${nome}.ts`), "utf8");
}

function importsInternos(nome: string): string[] {
  return [...fonte(nome).matchAll(/^import type \{[^}]*\} from "\.\/([a-z]+)";$/gm)].map((m) => m[1]);
}

describe("o pacote types/", () => {
  it("o índice só reexporta, um arquivo de domínio por linha, e todos eles", () => {
    const linhas = fonte("index")
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("/**") && !l.startsWith(" *"));
    expect(linhas).toEqual(dominios.map((d) => `export type * from "./${d}";`));
  });

  it("todo arquivo de domínio abre com o docstring de módulo", () => {
    for (const d of dominios) expect(fonte(d).startsWith("/** "), d).toBe(true);
  });

  it("os `import type` entre os arquivos de domínio não fecham ciclo", () => {
    const grafo = new Map(dominios.map((d) => [d, importsInternos(d)]));
    for (const [de, alvos] of grafo) for (const para of alvos) expect(grafo.has(para), `${de} -> ${para}`).toBe(true);
    const visitando = new Set<string>();
    const fechados = new Set<string>();
    function anda(no: string, caminho: string[]): void {
      if (fechados.has(no)) return;
      expect(visitando.has(no), `ciclo: ${[...caminho, no].join(" -> ")}`).toBe(false);
      visitando.add(no);
      for (const alvo of grafo.get(no) ?? []) anda(alvo, [...caminho, no]);
      visitando.delete(no);
      fechados.add(no);
    }
    for (const d of dominios) anda(d, []);
  });

  it(`o pacote exporta ${TIPOS_NO_PACOTE} tipos, contados nos arquivos de domínio`, () => {
    const nomes = dominios.flatMap((d) => [...fonte(d).matchAll(/^export (?:interface|type) ([A-Za-z]+)/gm)].map((m) => m[1]));
    expect(new Set(nomes).size, "nome repetido").toBe(nomes.length);
    expect(nomes.length).toBe(TIPOS_NO_PACOTE);
  });
});
