import { beforeEach, describe, expect, it, vi } from "vitest";

/* A assinatura vai explícita nas DUAS pontas, e cada uma por um motivo:
   `vi.fn(async () => …)` infere ZERO parâmetros, e aí ler `mock.calls[0][1]`
   não compila; e sem o tipo do RETORNO ele infere `ignoradas: never[]`, e
   `mockResolvedValueOnce` com uma linha dentro também não.

   ⚠️ Os dois passariam verdes no `vitest`. Quem pega é o `tsc -b`. */
const mocks = vi.hoisted(() => ({
  chamar: vi.fn(
    async (
      _caminho: string,
      _opcoes?: { method?: string; body?: unknown },
    ): Promise<{ removidas: number; ignoradas: unknown[]; recusadas: unknown[] }> => ({
      removidas: 0, ignoradas: [], recusadas: [],
    }),
  ),
}));
vi.mock("./client", () => mocks);

import { removerTarefasEmLote } from "./tarefas";
import { TETO_POR_PAGINA } from "../../constants";
import type { ChaveDeTarefa } from "../../types";

function chaves(quantas: number): ChaveDeTarefa[] {
  return Array.from({ length: quantas }, (_, i) => ({
    subgrupo_id: "s1", tarefa_id: `t${i}`, responsavel_id: null,
  }));
}

function corpoDaChamada(i: number) {
  return mocks.chamar.mock.calls[i][1]?.body as { tarefas: ChaveDeTarefa[] };
}

beforeEach(() => vi.clearAllMocks());

describe("removerTarefasEmLote", () => {
  it("manda a lista no corpo, por POST, na rota do lote", async () => {
    await removerTarefasEmLote(chaves(2));
    expect(mocks.chamar).toHaveBeenCalledTimes(1);
    expect(mocks.chamar.mock.calls[0][0]).toBe("/tarefas/remocao-em-lote");
    expect(mocks.chamar.mock.calls[0][1]?.method).toBe("POST");
    expect(corpoDaChamada(0).tarefas).toHaveLength(2);
  });

  it("🔴 o `responsavel_id` que a tela viu VAI no corpo", async () => {
    /* É ele que o servidor compara para recusar o que mudou de dono. Sem
       ele no fio, a guarda inteira do lote deixa de existir -- e o teste da
       tela não pegaria, porque lá a asserção é sobre o que a função recebe. */
    await removerTarefasEmLote([
      { subgrupo_id: "s1", tarefa_id: "t1", responsavel_id: null },
      { subgrupo_id: "s1", tarefa_id: "t2", responsavel_id: "ana@x.com" },
    ]);
    expect(corpoDaChamada(0).tarefas).toEqual([
      { subgrupo_id: "s1", tarefa_id: "t1", responsavel_id: null },
      { subgrupo_id: "s1", tarefa_id: "t2", responsavel_id: "ana@x.com" },
    ]);
  });

  it("no TETO exato manda uma requisição só", async () => {
    await removerTarefasEmLote(chaves(TETO_POR_PAGINA));
    expect(mocks.chamar).toHaveBeenCalledTimes(1);
    expect(corpoDaChamada(0).tarefas).toHaveLength(TETO_POR_PAGINA);
  });

  it("🔴 ACIMA do teto fatia, e nenhum pedaço passa dele", async () => {
    /* O par do teste acima. A rota recusa acima de 100 com 422 -- fatiar
       errado faria a tela falhar exatamente quando a seleção é grande, que
       é quando o lote serve para alguma coisa. */
    await removerTarefasEmLote(chaves(TETO_POR_PAGINA * 2 + 1));
    expect(mocks.chamar).toHaveBeenCalledTimes(3);
    expect(corpoDaChamada(0).tarefas).toHaveLength(TETO_POR_PAGINA);
    expect(corpoDaChamada(1).tarefas).toHaveLength(TETO_POR_PAGINA);
    expect(corpoDaChamada(2).tarefas).toHaveLength(1);
  });

  it("⚠️ nenhuma tarefa se perde nem se repete no fatiamento", () => {
    /* Fatiar com o índice errado some com uma linha ou manda outra duas
       vezes, e as duas falhas são silenciosas: a contagem final ainda
       parece plausível. */
    return removerTarefasEmLote(chaves(250)).then(() => {
      const enviadas = mocks.chamar.mock.calls.flatMap((c) =>
        (c[1]?.body as { tarefas: ChaveDeTarefa[] }).tarefas.map((t) => t.tarefa_id));
      expect(enviadas).toHaveLength(250);
      expect(new Set(enviadas).size).toBe(250);
    });
  });

  it("SOMA os resultados dos pedaços num só", async () => {
    mocks.chamar
      .mockResolvedValueOnce({ removidas: 98, ignoradas: [{ tarefa_id: "x" }], recusadas: [] })
      .mockResolvedValueOnce({ removidas: 1, ignoradas: [], recusadas: [{ tarefa_id: "y" }] });
    const r = await removerTarefasEmLote(chaves(TETO_POR_PAGINA + 1));
    expect(r.removidas).toBe(99);
    expect(r.ignoradas).toHaveLength(1);
    expect(r.recusadas).toHaveLength(1);
  });

  it("lista vazia não chama a API nenhuma vez", async () => {
    const r = await removerTarefasEmLote([]);
    expect(mocks.chamar).not.toHaveBeenCalled();
    expect(r).toEqual({ removidas: 0, ignoradas: [], recusadas: [] });
  });

  it("⚠️ falha num pedaço PROPAGA -- a tela não pode afirmar um número falso", async () => {
    mocks.chamar
      .mockResolvedValueOnce({ removidas: 100, ignoradas: [], recusadas: [] })
      .mockRejectedValueOnce(new Error("500"));
    await expect(removerTarefasEmLote(chaves(TETO_POR_PAGINA + 1))).rejects.toThrow("500");
  });
});
