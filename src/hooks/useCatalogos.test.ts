import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("catálogos compartilham chave E forma", () => {
  /**
   * 🔴 O React Query deduplica por chave e roda o `queryFn` de QUEM MONTA
   * PRIMEIRO. Duas funções de busca com formas diferentes na mesma chave
   * fazem o conteúdo do cache depender da ordem de montagem -- foi assim que
   * `CamposProcesso` sobrescrevia o catálogo completo de clientes com a
   * versão truncada em 100.
   *
   * `useTodosOsMembros` tinha voltado a fazer isso: desembrulhava
   * `{ membros }` para `Membro[]` dentro do `queryFn`, enquanto os três
   * consumidores vivos da mesma chave guardam a resposta inteira. Ninguém
   * usava o hook ainda; o primeiro que usasse reintroduziria o defeito.
   *
   * A regra: desembrulhar é papel do `select`, que muda a saída sem tocar
   * no cache.
   */
  it("useTodosOsMembros guarda a resposta inteira e desembrulha no select", () => {
    const fonte = readFileSync("src/hooks/useCatalogos.ts", "utf8");
    const bloco = fonte.slice(fonte.indexOf("export function useTodosOsMembros"));
    const corpo = bloco.slice(0, bloco.indexOf("\n}"));

    expect(corpo).toContain("select:");
    expect(corpo.match(/queryFn:\s*listarTodosOsMembrosDoGrupo\s*,/)).toBeTruthy();
    // O que NÃO pode: desembrulhar dentro do queryFn.
    //
    // ⚠️ `[^\n]*`, não `.*` com flag `s`: a primeira versão atravessava
    // linhas e casava do `queryFn:` até o `.membros` do `select` logo
    // abaixo -- acusando o código correto.
    expect(corpo).not.toMatch(/queryFn:[^\n]*\.membros/);
  });

  it("os consumidores da chave de membros continuam guardando a resposta inteira", () => {
    const consumidores = [
      "src/components/AppShell/Topbar/SinoDeNotificacoes/index.tsx",
      "src/pages/AtendimentosPage/index.tsx",
      "src/pages/SubgruposPage/components/MembrosDoSubgrupo/index.tsx",
    ];
    for (const arquivo of consumidores) {
      const fonte = readFileSync(arquivo, "utf8");
      const i = fonte.indexOf("qk.todosOsMembros()");
      expect(i, `${arquivo} deixou de usar a chave`).toBeGreaterThan(-1);
      const janela = fonte.slice(i, i + 200);
      expect(janela, `${arquivo}: forma divergente na chave compartilhada`)
        .toContain("listarTodosOsMembrosDoGrupo");
    }
  });
});
