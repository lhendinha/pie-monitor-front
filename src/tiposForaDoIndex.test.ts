import { describe, expect, it } from "vitest";

/** Nenhum `interface` ou `type` dentro de arquivo de componente, página ou
 * contexto -- nem as props.
 *
 * 🔴 A regra 5 da seção 3 do `CONTEXT.md`, na forma de 05/09/2026: tudo vai
 * para o `types.ts` da própria pasta (`contexts/types.ts` para os
 * provedores) ou para `src/types/` quando outra pasta importa. Até então
 * a interface de props podia ficar no arquivo, e este guarda mantinha uma
 * lista de permitidos; a lista era o ponto fraco -- um `*Props` a mais de um
 * componente que não existe passava.
 *
 * ⚠️ **Este guarda existe porque a varredura manual errou.** Em 03/09/2026 eu
 * achei cinco tipos em `index.tsx`, conferi que eram privados e não
 * exportados, e concluí que estavam "certos onde estão" -- o critério errado.
 * Privado justifica ficar na PASTA, não no arquivo do componente.
 *
 * ⚠️ Cobre TODO `.tsx` de `src/`, não só os `index.tsx`: a primeira versão
 * varria só os índices e deixou passar o `Sessao` de `contexts/SessaoContext.tsx`.
 */
const ARQUIVOS = import.meta.glob("/src/**/*.tsx", {
  eager: true, query: "?raw", import: "default",
}) as Record<string, string>;

/** Tipos e interfaces declarados no topo do arquivo. */
function tiposDeclarados(fonte: string): string[] {
  return [...fonte.matchAll(/^(?:export )?(?:interface|type) (\w+)/gm)].map((m) => m[1]);
}

describe("tipos fora dos arquivos de componente, página e contexto", () => {
  const arquivos = Object.entries(ARQUIVOS).filter(([caminho]) => !caminho.includes(".test."));

  it("varre a árvore de verdade -- senão o guarda passaria vazio", () => {
    expect(arquivos.length).toBeGreaterThan(150);
  });

  it("🔴 nenhum `.tsx` declara `interface` ou `type` -- nem as props", () => {
    const infratores = arquivos
      .filter(([, fonte]) => tiposDeclarados(fonte).length > 0)
      .map(([caminho, fonte]) => `${caminho.replace("/src/", "")} -> ${tiposDeclarados(fonte).join(", ")}`);
    expect(infratores).toEqual([]);
  });

  it("⚠️ e o guarda REPROVA até as props -- senão não guarda nada", () => {
    const fonte = `
interface MeuComponenteProps { a: string }
type Modo = "um" | "dois";
export default function MeuComponente() { return null }
`;
    expect(tiposDeclarados(fonte)).toEqual(["MeuComponenteProps", "Modo"]);
  });
});
