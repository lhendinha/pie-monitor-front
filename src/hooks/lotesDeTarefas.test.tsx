/** Os quatro hooks de ação em lote: o que chega ao cliente, e o que acontece
 * depois.
 *
 * 🔴 Um arquivo para os quatro, porque o contrato é o MESMO: mandar a lista no
 * formato do lote (`paraOLote`), invalidar tarefas E resumo, e devolver a quem
 * chama o que foi ENVIADO -- é dali que o Desfazer monta a chamada inversa.
 * Quatro arquivos iguais divergiriam no primeiro ajuste.
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  removerTarefasEmLote: vi.fn(),
  concluirTarefasEmLote: vi.fn(),
  alterarStatusEmLote: vi.fn(),
  atribuirTarefasEmLote: vi.fn(),
}));

vi.mock("../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../services")>();
  return { ...real, ...mocks };
});

import { qk } from "../services/queryKeys";
import { criarQueryClientDeTeste } from "../test/queryTestUtils";
import { useAlterarStatusEmLote } from "./useAlterarStatusEmLote";
import { useAtribuirTarefasEmLote } from "./useAtribuirTarefasEmLote";
import { useConcluirTarefasEmLote } from "./useConcluirTarefasEmLote";
import { useExcluirTarefasEmLote } from "./useExcluirTarefasEmLote";
import type { Tarefa } from "../types";

const COM_DONO = {
  subgrupo_id: "s1", tarefa_id: "t1", titulo: "Com dono", data: "2026-09-10",
  coluna_id: "c1", prioridade: "Média", responsavel_id: "ana@x.com",
} as Tarefa;
const SEM_DONO = { ...COM_DONO, tarefa_id: "t2", titulo: "Sem dono", responsavel_id: "" } as Tarefa;
const TAREFAS = [COM_DONO, SEM_DONO];
/* 🔴 O vazio vira `null` no fio: é afirmação, não omissão. */
const NO_FIO = [
  { subgrupo_id: "s1", tarefa_id: "t1", responsavel_id: "ana@x.com" },
  { subgrupo_id: "s1", tarefa_id: "t2", responsavel_id: null },
];

function montar<T>(usar: () => T) {
  const client = criarQueryClientDeTeste();
  const invalidar = vi.spyOn(client, "invalidateQueries");
  const Envolvedor = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(usar, { wrapper: Envolvedor }), invalidar };
}

beforeEach(() => vi.clearAllMocks());

/* Cada linha: o hook, o que se passa a `mutate`, o mock que deve ser chamado e
   com o quê. */
const CASOS = [
  {
    nome: "useExcluirTarefasEmLote",
    useDoCaso: (ok: never, falha: never) => useExcluirTarefasEmLote(ok, falha),
    pedido: TAREFAS,
    mock: mocks.removerTarefasEmLote,
    chamadoCom: [NO_FIO],
  },
  {
    nome: "useConcluirTarefasEmLote",
    useDoCaso: (ok: never, falha: never) => useConcluirTarefasEmLote(ok, falha),
    pedido: TAREFAS,
    mock: mocks.concluirTarefasEmLote,
    chamadoCom: [NO_FIO],
  },
  {
    nome: "useAlterarStatusEmLote",
    useDoCaso: (ok: never, falha: never) => useAlterarStatusEmLote(ok, falha),
    pedido: { tarefas: TAREFAS, colunaId: "c9" },
    mock: mocks.alterarStatusEmLote,
    chamadoCom: [NO_FIO, "c9"],
  },
  {
    nome: "useAtribuirTarefasEmLote (a uma pessoa)",
    useDoCaso: (ok: never, falha: never) => useAtribuirTarefasEmLote(ok, falha),
    pedido: { tarefas: TAREFAS, responsavelId: "bia@x.com" },
    mock: mocks.atribuirTarefasEmLote,
    chamadoCom: [NO_FIO, "bia@x.com"],
  },
  {
    nome: "useAtribuirTarefasEmLote (ao pool)",
    useDoCaso: (ok: never, falha: never) => useAtribuirTarefasEmLote(ok, falha),
    pedido: { tarefas: TAREFAS, responsavelId: null },
    mock: mocks.atribuirTarefasEmLote,
    /* ⚠️ `null`, e não `undefined`: devolver ao pool é uma escolha. */
    chamadoCom: [NO_FIO, null],
  },
];

describe.each(CASOS)("$nome", ({ useDoCaso, pedido, mock, chamadoCom }) => {
  it("manda ao cliente a lista no formato do lote", async () => {
    mock.mockResolvedValue({ ok: true });
    const aoTerminar = vi.fn();
    const { result } = montar(() => useDoCaso(aoTerminar as never, vi.fn() as never));

    act(() => {
      (result.current.mutate as (p: unknown) => void)(pedido);
    });

    await waitFor(() => expect(aoTerminar).toHaveBeenCalled());
    expect(mock).toHaveBeenCalledWith(...chamadoCom);
  });

  it("🔴 invalida tarefas E resumo -- o card e a contagem falam do mesmo conjunto", async () => {
    mock.mockResolvedValue({ ok: true });
    const aoTerminar = vi.fn();
    const { result, invalidar } = montar(() => useDoCaso(aoTerminar as never, vi.fn() as never));

    act(() => {
      (result.current.mutate as (p: unknown) => void)(pedido);
    });

    await waitFor(() => expect(aoTerminar).toHaveBeenCalled());
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["tarefas"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: qk.resumo() });
  });

  it("devolve o resultado -- e o que foi ENVIADO, para o Desfazer", async () => {
    const resultado = { ok: true };
    mock.mockResolvedValue(resultado);
    const aoTerminar = vi.fn();
    const { result } = montar(() => useDoCaso(aoTerminar as never, vi.fn() as never));

    act(() => {
      (result.current.mutate as (p: unknown) => void)(pedido);
    });

    await waitFor(() => expect(aoTerminar).toHaveBeenCalled());
    expect(aoTerminar.mock.calls[0][0]).toBe(resultado);
    expect(aoTerminar.mock.calls[0][1]).toBe(pedido);
  });

  it("⚠️ falhando, avisa quem chama e NÃO invalida nada", async () => {
    /* Invalidar depois de uma falha recarregaria a lista como se algo tivesse
       mudado -- e a pessoa leria o recarregamento como sucesso. */
    const erro = new Error("500");
    mock.mockRejectedValue(erro);
    const aoTerminar = vi.fn();
    const aoFalhar = vi.fn();
    const { result, invalidar } = montar(() => useDoCaso(aoTerminar as never, aoFalhar as never));

    act(() => {
      (result.current.mutate as (p: unknown) => void)(pedido);
    });

    await waitFor(() => expect(aoFalhar).toHaveBeenCalled());
    expect(aoFalhar.mock.calls[0][0]).toBe(erro);
    expect(aoTerminar).not.toHaveBeenCalled();
    expect(invalidar).not.toHaveBeenCalled();
  });
});
