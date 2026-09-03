import { describe, expect, it } from "vitest";

/** Interface que não é as props do componente NÃO mora no `index.tsx`.
 *
 * 🔴 A regra do projeto, escrita em `CONTEXT.md` ("alcance decide o
 * destino") e explicitada em 03/09/2026: o `index.tsx` declara o componente
 * e, no máximo, as props DELE. Qualquer outro tipo vai para o `types.ts` da
 * própria pasta -- ou para `src/types/` quando serve a mais de uma tela.
 *
 * ⚠️ **Este guarda existe porque a varredura manual errou.** Ao procurar
 * componentes fora do lugar eu achei cinco tipos em `index.tsx`, conferi que
 * eram privados e não exportados, e concluí que estavam "certos onde
 * estão" -- o critério errado. Privado justifica ficar na PASTA, não no
 * arquivo do componente. Foram quatro correções: `ToastContextValue`, `Aba`,
 * `OpcaoDeFiltro` e `NoModal`.
 *
 * ⚠️ **O que continua permitido, e por quê:**
 * - `<NomeDaPasta>Props` -- é o contrato do componente, e separá-lo do
 *   componente obrigaria a abrir dois arquivos para ler uma assinatura;
 * - `<OutroComponenteDoArquivo>Props` -- um arquivo pode legitimamente ter
 *   dois componentes quando um é casca do outro (`ToastProvider` ao lado do
 *   `useToast`), e cada um leva as próprias props.
 */

/* ⚠️ `index.tsx` E `contexts/*.tsx`. A primeira versão varria só os `index`,
   e por isso deixou passar o `Sessao` do `SessaoContext.tsx` -- que é um
   arquivo solto, não uma pasta com índice. O guarda tem de cobrir todo lugar
   onde a regra vale, e não só a forma mais comum. */
const ARQUIVOS = {
  ...(import.meta.glob("/src/**/index.tsx", {
    eager: true, query: "?raw", import: "default",
  }) as Record<string, string>),
  ...(import.meta.glob("/src/contexts/*.tsx", {
    eager: true, query: "?raw", import: "default",
  }) as Record<string, string>),
};

/** Tipos e interfaces declarados no topo do arquivo. */
function tiposDeclarados(fonte: string): string[] {
  return [...fonte.matchAll(/^(?:export )?(?:interface|type) (\w+)/gm)].map((m) => m[1]);
}

/** Componentes de topo -- é o que decide quais `*Props` são legítimos. */
function componentes(fonte: string): string[] {
  return [...fonte.matchAll(/^(?:export default |export )?function ([A-Z]\w*)\s*\(/gm)].map(
    (m) => m[1],
  );
}

describe("tipos fora do index.tsx", () => {
  it("varre a árvore de verdade -- senão o guarda passaria vazio", () => {
    expect(Object.keys(ARQUIVOS).length).toBeGreaterThan(80);
  });

  it("🔴 nenhum `index.tsx` declara tipo que não sejam as props de um componente dele", () => {
    const infratores: string[] = [];

    for (const [caminho, fonte] of Object.entries(ARQUIVOS)) {
      if (caminho.includes(".test.")) continue;
      const partes = caminho.split("/");
      /* Em pasta com índice, quem nomeia é a PASTA; em arquivo solto
         (`contexts/SessaoContext.tsx`), é o próprio arquivo. */
      const base = partes[partes.length - 1] === "index.tsx"
        ? partes[partes.length - 2]
        : partes[partes.length - 1].replace(".tsx", "");
      const permitidos = new Set([
        `${base}Props`,
        ...componentes(fonte).map((c) => `${c}Props`),
      ]);

      for (const tipo of tiposDeclarados(fonte)) {
        if (!permitidos.has(tipo)) {
          infratores.push(`${caminho.replace("/src/", "")} -> ${tipo}`);
        }
      }
    }

    expect(infratores).toEqual([]);
  });

  it("⚠️ e o guarda REPROVA quando o tipo não é props -- senão não guarda nada", () => {
    /* A mutação embutida: sem isto, um `permitidos` grande demais faria o
       teste acima passar com qualquer coisa. */
    const fonte = `
interface CoisaQualquer { a: string }
export default function MeuComponente() { return null }
`;
    const permitidos = new Set(["MeuComponenteProps"]);
    const fora = tiposDeclarados(fonte).filter((t) => !permitidos.has(t));

    expect(fora).toEqual(["CoisaQualquer"]);
  });
});
