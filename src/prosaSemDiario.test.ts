import { describe, expect, it } from "vitest";

/** Data em comentário só na mesma frase que "medi" -- o resto é diário, e
 * diário mora no `CONTEXT.md`.
 *
 * 🔴 É a parte mecânica da seção 0b do `CONTEXT.md`: "até tal dia dizia",
 * "corrigido em", "a versão anterior" saem do código; fica só a data que
 * acompanha um número medido, porque número envelhece e a data diz quando
 * remedir. O irmão é `api/tests/test_docstring_sem_diario.py`.
 *
 * ⚠️ A janela é a FRASE, não a linha: a data pode vir na linha seguinte à
 * palavra "medido". E as duas formas que existem em `src/` contam:
 * `dd/mm/aaaa` e `mm/aaaa`.
 *
 * ➡️ Fase 3 do `PLANO_ARQUIVOS_MENORES.md`: `JA_LIMPOS` cresce a cada grupo,
 * e no último vira `src/` inteiro.
 */
const FONTES = import.meta.glob("/src/**/*.{ts,tsx}", {
  eager: true, query: "?raw", import: "default",
}) as Record<string, string>;

/** Pastas e arquivos já no padrão (caminho relativo a `src/`). Uma pasta
 * cobre tudo dentro dela. */
const JA_LIMPOS = [
  "types/",
  "components/ModalDeTarefa/",
  "components/ModalDeDocumento/",
  "pages/",
];

/** Testes, tipos de ambiente e o setup não são prosa do produto. */
const FORA = /\.test\.|\.d\.ts$|^test\//;

const DATA = /\b\d{2}\/\d{2}\/\d{4}\b|\b\d{2}\/\d{4}\b/;
const MEDIDO = /medi/i;
const COMENTARIO_DE_BLOCO = /\/\*[\s\S]*?\*\//g;
const COMENTARIO_DE_LINHA = /^[ \t]*\/\/[^\n]*(?:\n[ \t]*\/\/[^\n]*)*/gm;

/** Cada frase de cada comentário, com a linha em que o comentário começa. */
function frases(fonte: string): { linha: number; frase: string }[] {
  const saida: { linha: number; frase: string }[] = [];
  for (const re of [COMENTARIO_DE_BLOCO, COMENTARIO_DE_LINHA]) {
    for (const m of fonte.matchAll(re)) {
      const linha = fonte.slice(0, m.index).split("\n").length;
      const texto = m[0].replace(/^[ \t]*(\/\/|\*)\s?/gm, "").replace(/\s+/g, " ");
      for (const frase of texto.split(/(?<=[.!?])\s+/)) saida.push({ linha, frase });
    }
  }
  return saida;
}

function diario(fonte: string): string[] {
  return frases(fonte)
    .filter(({ frase }) => DATA.test(frase) && !MEDIDO.test(frase))
    .map(({ linha, frase }) => `${linha}: ${frase.trim().slice(0, 90)}`);
}

const limpos = Object.entries(FONTES)
  .map(([caminho, fonte]) => [caminho.replace("/src/", ""), fonte] as const)
  .filter(([caminho]) => !FORA.test(caminho))
  .filter(([caminho]) => JA_LIMPOS.some((p) => (p.endsWith("/") ? caminho.startsWith(p) : caminho === p)));

describe("prosa sem diário", () => {
  it("varre arquivos de verdade -- senão o guarda passaria vazio", () => {
    expect(limpos.length).toBeGreaterThan(20);
    /* O par negativo do leitor: comentário existe e é lido. Um extrator que
       devolvesse nada passaria em "sem data" por não ver nada. */
    expect(limpos.reduce((soma, [, fonte]) => soma + frases(fonte).length, 0)).toBeGreaterThan(100);
  });

  it.each(limpos.map(([caminho]) => caminho))("%s: data só ao lado de número medido", (caminho) => {
    const fonte = limpos.find(([c]) => c === caminho)![1];
    expect(diario(fonte)).toEqual([]);
  });

  it("⚠️ e o guarda REPROVA a data solta e ACEITA a medida -- senão não guarda nada", () => {
    expect(diario("/* corrigido em 30/08/2026, a partir de um relato. */")).toHaveLength(1);
    expect(diario("// medido em 26/08/2026: card 0, lista 1.")).toEqual([]);
    expect(diario("/** Contado\n * em 09/2026, medido no DynamoDB. */")).toEqual([]);
  });
});
