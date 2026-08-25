import { describe, expect, it } from "vitest";

import { qk } from "../services/queryKeys";

describe("chaves dos catálogos", () => {
  it("🔴 catálogo COMPLETO tem chave própria, separada da de uma página", () => {
    /* Depois que `useCatalogosDeProcesso` passou a percorrer todas as
     * páginas, nove outras consultas continuaram pedindo uma página só -- na
     * MESMA chave. O React Query deduplica por chave e roda o `queryFn` de
     * quem registra primeiro, então o resultado dependia da ordem de
     * montagem. Pior: `CamposProcesso` monta DENTRO da ProcessosPage, então
     * abrir "Novo processo" sobrescrevia o catálogo completo com a versão
     * truncada em 100 -- num grupo com 150 clientes, o nome na tabela virava
     * o id cru.
     *
     * ⚠️ Cliente saiu da lista porque não tem mais catálogo completo: os dois
     * seletores dele viraram busca. A regra continua valendo pros que
     * sobraram, e é ela que este teste guarda. */
    expect(qk.todosOsSubgrupos()).not.toEqual(qk.subgrupos({ tamanhoPagina: 100 }));
    expect(qk.todasAsOpcoes("fase")).not.toEqual(qk.opcoesProcesso("fase", { tamanhoPagina: 100 }));
  });

  it("mas o PREFIXO continua o mesmo, pra invalidação alcançar os dois", () => {
    expect(qk.todosOsSubgrupos()[0]).toBe(qk.subgrupos()[0]);
    expect(qk.todasAsOpcoes("fase").slice(0, 2)).toEqual(qk.opcoesProcesso("fase").slice(0, 2));
  });

  it("🔴 `qk.membros()` NÃO alcança `qk.todosOsMembros()` -- por isso a invalidação usa o prefixo nu", () => {
    /* `qk.membros()` é `["membros", {}]`, e o `partialMatchKey` do React
     * Query rejeita `{}` contra a string `"todos"` por tipo. O docstring
     * afirmava que invalidar por `qk.membros()` derrubava os dois; não
     * derruba. Quem invalida tem que usar `["membros"]`. */
    expect(qk.membros()).not.toEqual(qk.todosOsMembros());
    expect(qk.membros()[0]).toBe(qk.todosOsMembros()[0]);
  });
});
