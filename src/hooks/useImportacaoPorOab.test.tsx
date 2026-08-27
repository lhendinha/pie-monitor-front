import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ⚠️ `vi.hoisted` porque `vi.mock` é içado para o topo do arquivo: um objeto
 * declarado normalmente ainda não existe quando a fábrica roda. */
const api = vi.hoisted(() => ({
  buscarProcessosPorOab: vi.fn(),
  importarProcessos: vi.fn(),
}));
vi.mock("../services/api", () => api);

import { useImportacaoPorOab } from "./useImportacaoPorOab";
import { limparOuvintesDoCanal, publicarNoCanal } from "../utils/canalDeTempoReal";
import type { MensagemDoCanal } from "../types";

const ACHADO = {
  numero_processo: "50062528720248210001",
  apelido: "Execução Fiscal",
  comunicacoes: 3,
  ja_existe: false,
};

function previa(processos = [ACHADO]) {
  return { id: "abc", total_encontrado: processos.length, atingiu_o_teto: false, processos };
}

beforeEach(() => {
  vi.clearAllMocks();
  limparOuvintesDoCanal();
});

describe("as duas etapas", () => {
  it("busca leva à prévia", async () => {
    api.buscarProcessosPorOab.mockResolvedValue(previa());
    const { result } = renderHook(() => useImportacaoPorOab("sub"));

    await act(() => result.current.buscar("123456", "RS"));

    expect(result.current.etapa).toBe("previa");
    expect(result.current.previa?.processos).toHaveLength(1);
  });

  it("🔴 lista vazia é `vazio`, NÃO `erro`", () => {
    /* "Nada encontrado" é resposta de sucesso do PJe; "falhou" é o serviço
       fora do ar. Misturá-los mandaria a pessoa corrigir um número que está
       certo -- ou tentar de novo o que nunca vai funcionar. */
    api.buscarProcessosPorOab.mockResolvedValue(previa([]));
    const { result } = renderHook(() => useImportacaoPorOab("sub"));

    return act(() => result.current.buscar("999999", "SC")).then(() => {
      expect(result.current.etapa).toBe("vazio");
      expect(result.current.erro).toBe("");
    });
  });

  it("falha da API é `erro`, com a mensagem dela", async () => {
    api.buscarProcessosPorOab.mockRejectedValue(new Error("O PJe está limitando"));
    const { result } = renderHook(() => useImportacaoPorOab("sub"));

    await act(() => result.current.buscar("123456", "RS"));

    expect(result.current.etapa).toBe("erro");
    expect(result.current.erro).toBe("O PJe está limitando");
  });

  it("importar manda o id da busca, não os dados", async () => {
    api.buscarProcessosPorOab.mockResolvedValue(previa());
    api.importarProcessos.mockResolvedValue({
      cadastrados: 1, ja_existiam: 0, falharam: [],
    });
    const { result } = renderHook(() => useImportacaoPorOab("sub"));
    await act(() => result.current.buscar("123456", "RS"));

    await act(() => result.current.importar([ACHADO.numero_processo], ["eu@x.com"]));

    expect(api.importarProcessos).toHaveBeenCalledWith(
      "sub", "abc", [ACHADO.numero_processo], ["eu@x.com"],
    );
    expect(result.current.etapa).toBe("concluido");
  });
});

describe("a resposta velha não pode ganhar da nova", () => {
  it("🔴 buscar de novo descarta o resultado da primeira", async () => {
    /* Corrigir a OAB e buscar de novo pode fazer a primeira resposta chegar
       depois -- e a tela mostraria a lista da inscrição errada, sem nada
       indicando isso. */
    let resolverPrimeira: (v: unknown) => void = () => {};
    api.buscarProcessosPorOab
      .mockImplementationOnce(() => new Promise((r) => (resolverPrimeira = r)))
      .mockResolvedValueOnce(previa([{ ...ACHADO, apelido: "A CERTA" }]));

    const { result } = renderHook(() => useImportacaoPorOab("sub"));
    act(() => void result.current.buscar("111111", "RS"));
    await act(() => result.current.buscar("222222", "RS"));

    await act(async () => resolverPrimeira(previa([{ ...ACHADO, apelido: "A ERRADA" }])));

    expect(result.current.previa?.processos[0].apelido).toBe("A CERTA");
  });

  it("recomeçar descarta a busca em curso", async () => {
    let resolver: (v: unknown) => void = () => {};
    api.buscarProcessosPorOab.mockImplementation(() => new Promise((r) => (resolver = r)));
    const { result } = renderHook(() => useImportacaoPorOab("sub"));
    act(() => void result.current.buscar("123456", "RS"));

    act(() => result.current.recomecar());
    await act(async () => resolver(previa()));

    expect(result.current.etapa).toBe("formulario");
    expect(result.current.previa).toBeNull();
  });
});

describe("a barra de progresso", () => {
  it("acompanha o canal", async () => {
    const { result } = renderHook(() => useImportacaoPorOab("sub"));

    act(() => {
      publicarNoCanal({
        tipo: "importacao_progresso", feitos: 25, total: 100,
      } as unknown as MensagemDoCanal);
    });

    await waitFor(() => expect(result.current.progresso).toEqual({ feitos: 25, total: 100 }));
  });

  it("🔴 ouve o canal ANTES de a importação começar", async () => {
    /* A primeira mensagem (`feitos: 0`) sai antes de o `await` devolver o
       controle. Assinar ao clicar em "Importar" perderia justamente ela -- a
       barra começaria do segundo pulso, ou de lugar nenhum numa importação
       curta. */
    const { result } = renderHook(() => useImportacaoPorOab("sub"));

    act(() => {
      publicarNoCanal({
        tipo: "importacao_progresso", feitos: 0, total: 3,
      } as unknown as MensagemDoCanal);
    });

    await waitFor(() => expect(result.current.progresso).toEqual({ feitos: 0, total: 3 }));
  });

  it("nasce em zero ao importar, para a barra existir sem o canal", async () => {
    /* Se o WebSocket estiver fechado, nenhuma mensagem chega -- e a barra
       precisa aparecer mesmo assim, indeterminada, em vez de sumir. */
    api.buscarProcessosPorOab.mockResolvedValue(previa());
    api.importarProcessos.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useImportacaoPorOab("sub"));
    await act(() => result.current.buscar("123456", "RS"));

    act(() => void result.current.importar(["a", "b"], []));

    await waitFor(() => expect(result.current.progresso).toEqual({ feitos: 0, total: 2 }));
  });

  it("para de ouvir ao desmontar", () => {
    const { result, unmount } = renderHook(() => useImportacaoPorOab("sub"));
    unmount();

    publicarNoCanal({
      tipo: "importacao_progresso", feitos: 9, total: 9,
    } as unknown as MensagemDoCanal);

    expect(result.current.progresso).toBeNull();
  });
});

describe("a interrupção no meio", () => {
  it("🔴 a mensagem NÃO afirma que nada foi gravado", async () => {
    /* Um timeout deixa os processos já criados no banco. Dizer "a importação
       falhou" mandaria a pessoa procurar o que já está lá. */
    api.buscarProcessosPorOab.mockResolvedValue(previa());
    api.importarProcessos.mockRejectedValue({});
    const { result } = renderHook(() => useImportacaoPorOab("sub"));
    await act(() => result.current.buscar("123456", "RS"));

    await act(() => result.current.importar(["a"], []));

    expect(result.current.erro).toContain("pode ter sido cadastrada");
    expect(result.current.erro).toContain("só o que falta");
  });
});
