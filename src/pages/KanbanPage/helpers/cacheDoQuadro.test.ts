import { describe, expect, it } from "vitest";

import { moverTarefaNaLista } from "./cacheDoQuadro";
import type { Tarefa } from "../../../types";

const tarefa = (id: string, coluna: string): Tarefa => ({
  subgrupo_id: "sg",
  tarefa_id: id,
  titulo: `Tarefa ${id}`,
  data: "2026-09-01",
  coluna_id: coluna,
  prioridade: "Média",
});

const LISTA = [tarefa("t1", "fazer"), tarefa("t2", "fazer"), tarefa("t3", "fazendo")];

describe("moverTarefaNaLista", () => {
  it("troca a coluna só da tarefa movida", () => {
    const nova = moverTarefaNaLista(LISTA, "t1", "fazendo");
    expect(nova?.map((t) => [t.tarefa_id, t.coluna_id])).toEqual([
      ["t1", "fazendo"],
      ["t2", "fazer"],
      ["t3", "fazendo"],
    ]);
  });

  it("não muta a lista original", () => {
    // O carimbo otimista roda sobre o cache do React Query. Mutando no
    // lugar, o rollback do `onError` restauraria um objeto que já foi
    // alterado -- o cartão nunca voltaria pra coluna de origem.
    const antes = JSON.stringify(LISTA);
    moverTarefaNaLista(LISTA, "t1", "fazendo");
    expect(JSON.stringify(LISTA)).toBe(antes);
  });

  it("preserva a ordem e os demais campos", () => {
    const nova = moverTarefaNaLista(LISTA, "t2", "concluido");
    expect(nova?.[1]).toEqual({ ...tarefa("t2", "concluido") });
    expect(nova).toHaveLength(3);
  });

  it("tarefa ausente da lista deixa tudo como está", () => {
    // Acontece de verdade: o mesmo cartão vive em várias listas em cache
    // (janelas de data diferentes), e a arrastada carimba TODAS -- as que
    // não contêm a tarefa não podem ser tocadas.
    const nova = moverTarefaNaLista(LISTA, "inexistente", "concluido");
    expect(nova).toEqual(LISTA);
  });

  it("`undefined` sai `undefined`, e não lista vazia", () => {
    // `setQueriesData` chama o atualizador também pra chaves sem dado.
    // Devolvendo `[]`, criaria cache vazio pra uma consulta que nem rodou
    // -- e o quadro apareceria sem cartão nenhum.
    expect(moverTarefaNaLista(undefined, "t1", "fazendo")).toBeUndefined();
  });
});

describe("caches que não guardam lista", () => {
  it("🔴 um objeto entra e sai intacto, em vez de estourar", () => {
    /* O prefixo `["tarefas"]` é compartilhado por consultas de formatos
     * diferentes: a Área de trabalho guarda `{tarefas, total, total_paginas}`
     * e o detalhe do processo guarda outro objeto. O `.map` lançava
     * `TypeError` DENTRO do `onMutate` do arraste -- e quando o `onMutate`
     * lança, o React Query nunca chama o `mutationFn`: o PATCH não saía e o
     * cartão não mudava de coluna no servidor. Bastava passar pela Área de
     * trabalho (a rota inicial) e ir pro Kanban dentro dos 5 min de cache. */
    const paginada = { tarefas: [], total: 0, total_paginas: 0 } as unknown as undefined;
    expect(() => moverTarefaNaLista(paginada, "t1", "c2")).not.toThrow();
    expect(moverTarefaNaLista(paginada, "t1", "c2")).toBe(paginada);
  });
});
