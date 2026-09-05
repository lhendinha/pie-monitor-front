import { describe, expect, it } from "vitest";

/** Arquivo de hook tem UM hook, e nada mais: nem segundo hook, nem função
 * auxiliar, nem `interface`/`type`.
 *
 * 🔴 As duas regras do `CONTEXT.md` (seção 3, regras 7 e 8), dadas em
 * 05/09/2026 depois de uma varredura achar `Janela` dentro de
 * `useTarefasDoQuadro.ts` e dois hooks dentro de `useConteudoDoSubgrupo.ts`.
 * O tipo vai para o `types.ts` da pasta ou para `src/types/`; a função
 * auxiliar vai para arquivo próprio.
 *
 * ⚠️ A varredura manual achou nove tipos e quatro arquivos com mais de um
 * hook -- o guarda existe porque a próxima varredura seria manual de novo.
 */
const HOOKS = import.meta.glob("/src/**/use*.{ts,tsx}", {
  eager: true, query: "?raw", import: "default",
}) as Record<string, string>;

function tiposDeclarados(fonte: string): string[] {
  return [...fonte.matchAll(/^(?:export )?(?:interface|type) (\w+)/gm)].map((m) => m[1]);
}

/** Todo `export` de valor no topo do arquivo, com o nome. */
function exportsDeValor(fonte: string): string[] {
  return [...fonte.matchAll(/^export (?:async )?(?:function|const|let) (\w+)/gm)].map((m) => m[1]);
}

describe("um hook por arquivo", () => {
  const arquivos = Object.entries(HOOKS).filter(([caminho]) => !caminho.includes(".test."));

  it("varre a árvore de verdade -- senão o guarda passaria vazio", () => {
    expect(arquivos.length).toBeGreaterThan(30);
  });

  it("🔴 nenhum arquivo de hook declara `interface` ou `type`", () => {
    const infratores = arquivos
      .filter(([, fonte]) => tiposDeclarados(fonte).length > 0)
      .map(([caminho, fonte]) => `${caminho.replace("/src/", "")} -> ${tiposDeclarados(fonte).join(", ")}`);
    expect(infratores).toEqual([]);
  });

  it("🔴 cada arquivo exporta exatamente o hook que o nomeia, e nada mais", () => {
    const infratores: string[] = [];
    for (const [caminho, fonte] of arquivos) {
      const nome = caminho.split("/").pop()!.replace(/\.tsx?$/, "");
      const exportados = exportsDeValor(fonte);
      if (exportados.length !== 1 || exportados[0] !== nome) {
        infratores.push(`${caminho.replace("/src/", "")} -> ${exportados.join(", ") || "(nada)"}`);
      }
    }
    expect(infratores).toEqual([]);
  });

  it("⚠️ e o guarda REPROVA um segundo hook e uma auxiliar -- senão não guarda nada", () => {
    const fonte = `export function useCoisa() {}\nexport function ajuda() {}\ninterface Opcoes { a: 1 }\n`;
    expect(exportsDeValor(fonte)).toEqual(["useCoisa", "ajuda"]);
    expect(tiposDeclarados(fonte)).toEqual(["Opcoes"]);
  });
});
