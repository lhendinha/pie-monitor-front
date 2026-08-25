import { describe, expect, it } from "vitest";


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
    /* ⚠️ `import.meta.glob` do Vite, não `node:fs` -- o projeto não tem
     * `@types/node`, e a versão anterior passava no vitest mas quebrava o
     * `tsc -b` do `yarn build`. */
    const fonte = (import.meta.glob("./useCatalogos.ts", {
      query: "?raw", import: "default", eager: true,
    }) as Record<string, string>)["./useCatalogos.ts"];
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
    const fontes = import.meta.glob("../**/*.tsx", {
      query: "?raw", import: "default", eager: true,
    }) as Record<string, string>;
    for (const arquivo of consumidores) {
      const chave = arquivo.replace("src/", "../");
      const fonte = fontes[chave];
      expect(fonte, `não achei ${arquivo}`).toBeDefined();
      const i = fonte.indexOf("qk.todosOsMembros()");
      expect(i, `${arquivo} deixou de usar a chave`).toBeGreaterThan(-1);
      const janela = fonte.slice(i, i + 200);
      expect(janela, `${arquivo}: forma divergente na chave compartilhada`)
        .toContain("listarTodosOsMembrosDoGrupo");
    }
  });
});

describe("catálogos não têm staleTime", () => {
  /**
   * 🔴 Isto é um teste sobre uma DECISÃO, não sobre comportamento -- e ele
   * existe porque eu tomei a decisão errada por não medir.
   *
   * Uma auditoria apontou que `todasAsPaginas` sobre coleção que cresce sem
   * limite refaria a caminhada a cada montagem e a cada foco de janela. Pus
   * cinco minutos de validade. Depois medi, em produção: clientes 2,
   * subgrupos 8, atendimentos 1, membros 15, opções 88 -- tudo em UMA
   * página. A economia era de uma requisição.
   *
   * O custo não era. O canal WebSocket só invalida notificação, então a
   * única coisa que trazia dado de outra pessoa era o
   * `refetchOnWindowFocus` -- e é exatamente ele que o `staleTime`
   * desliga. A sócia cadastra um cliente, você volta pra aba, e o select
   * não o mostra por cinco minutos.
   *
   * Se um dia o volume justificar, o ajuste certo não é este: é parar de
   * caminhar todas as páginas pra rotular tarefa.
   */
  it("nenhum catálogo declara staleTime", async () => {
    const fonte = (
      import.meta.glob("./useCatalogos.ts", {
        query: "?raw",
        import: "default",
        eager: true,
      }) as Record<string, string>
    )["./useCatalogos.ts"];

    // Ignora o bloco de comentário que explica a ausência.
    const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(semComentarios).not.toContain("staleTime");
  });
});
