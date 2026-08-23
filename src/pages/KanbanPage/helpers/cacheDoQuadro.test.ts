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
