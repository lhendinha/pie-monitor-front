/** Nenhum symlink entra no repositório.
 *
 * 🔴 **A build de produção parou por causa de um.** Em 07/09/2026 um
 * `node_modules` virou symlink dentro de uma worktree temporária e foi para
 * um commit; o `yarn install` do Vercel morreu com `EEXIST: file already
 * exists, mkdir '/vercel/path0/node_modules'`, a build falhou, e o Vercel
 * seguiu servindo o deploy anterior. O site continuou no ar -- por isso o
 * defeito parecia "nada aconteceu" em vez de "a publicação parou".
 *
 * ⚠️ **O `.gitignore` não bastou, e o motivo é sutil:** `node_modules/`, com
 * barra, casa só com DIRETÓRIO. Um symlink com esse nome é arquivo, passa
 * pela regra e vai para o índice. As duas formas estão lá agora, mas a regra
 * de ignorar protege UM nome -- este guarda protege o repositório inteiro.
 *
 * ⚠️ Symlink no índice é `mode 120000`, e é isso que se procura: o `git
 * status` mostra o arquivo como qualquer outro, e um `git add -A` o leva
 * junto sem avisar.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/** `git ls-files -s` traz o modo de cada arquivo rastreado. */
function rastreados(): { modo: string; caminho: string }[] {
  const saida = execFileSync("git", ["ls-files", "-s"], { encoding: "utf8" });
  return saida
    .split("\n")
    .filter(Boolean)
    .map((linha) => {
      const [modo, , resto] = linha.split(/\s+/, 3);
      return { modo, caminho: linha.slice(linha.indexOf("\t") + 1) };
    });
}

const MODO_SYMLINK = "120000";

describe("nada de symlink no repositório", () => {
  it("varre o índice de verdade -- senão passaria vazio", () => {
    expect(rastreados().length).toBeGreaterThan(300);
  });

  it("🔴 nenhum arquivo rastreado é symlink", () => {
    const links = rastreados()
      .filter((a) => a.modo === MODO_SYMLINK)
      .map((a) => a.caminho);
    expect(links, "symlink commitado quebra a build do Vercel").toEqual([]);
  });

  it("e o guarda reconheceria um -- o par negativo", () => {
    /* Sem isto, um guarda que lê o modo errado passaria para sempre. */
    const falso = [{ modo: MODO_SYMLINK, caminho: "node_modules" }];
    expect(falso.filter((a) => a.modo === MODO_SYMLINK).map((a) => a.caminho))
      .toEqual(["node_modules"]);
  });
});
