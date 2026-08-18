import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarHistorico: vi.fn(),
  detalhesProcesso: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, listarHistorico: mocks.listarHistorico, detalhesProcesso: mocks.detalhesProcesso };
});

import HistoricoPage from "./index";

const ITEM = {
  numero_processo: "00002668720218130559",
  enviado_em: "2026-08-15T03:02:13.990064+00:00",
  tipo_comunicacao: "Intimação",
  nome_orgao: "Vara Única",
  comunicacao_id: 671027498,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalhesProcesso.mockResolvedValue({ comunicacoes: [] });
  mocks.listarHistorico.mockResolvedValue({ historico: [ITEM], total: 1, total_paginas: 1 });
});

describe("HistoricoPage", () => {
  it("mostra a lista paginada", async () => {
    renderComProviders(<HistoricoPage />);
    expect(await screen.findByText("Intimação", { exact: false })).toBeInTheDocument();
    expect(mocks.listarHistorico).toHaveBeenCalledWith({ pagina: 1, tamanhoPagina: 10 });
  });

  it("deep link com match abre o modal certo sozinho e consome o link", async () => {
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.numeroProcesso
        ? Promise.resolve({ historico: [ITEM] })
        : Promise.resolve({ historico: [ITEM], total: 1, total_paginas: 1 })
    );
    const onDeepLinkConsumido = vi.fn();
    renderComProviders(
      <HistoricoPage
        deepLink={{ processo: ITEM.numero_processo, comunicacaoId: String(ITEM.comunicacao_id) }}
        onDeepLinkConsumido={onDeepLinkConsumido}
      />
    );

    expect(await screen.findByText("Detalhes do envio")).toBeInTheDocument();
    expect(mocks.listarHistorico).toHaveBeenCalledWith({ numeroProcesso: ITEM.numero_processo });
    await waitFor(() => expect(onDeepLinkConsumido).toHaveBeenCalledTimes(1));
  });

  it("deep link sem match no comunicacao_id mostra toast e ainda consome o link", async () => {
    mocks.listarHistorico.mockImplementation((opcoes: any) =>
      opcoes?.numeroProcesso
        ? Promise.resolve({ historico: [] })
        : Promise.resolve({ historico: [ITEM], total: 1, total_paginas: 1 })
    );
    const onDeepLinkConsumido = vi.fn();
    renderComProviders(
      <HistoricoPage
        deepLink={{ processo: "outro-numero", comunicacaoId: "999" }}
        onDeepLinkConsumido={onDeepLinkConsumido}
      />
    );

    expect(
      await screen.findByText("Não foi possível localizar a notificação do link recebido.")
    ).toBeInTheDocument();
    await waitFor(() => expect(onDeepLinkConsumido).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Detalhes do envio")).not.toBeInTheDocument();
  });

  it("sem deepLink, não dispara a busca por numeroProcesso", async () => {
    renderComProviders(<HistoricoPage />);
    await screen.findByText("Intimação", { exact: false });
    expect(mocks.listarHistorico).not.toHaveBeenCalledWith(
      expect.objectContaining({ numeroProcesso: expect.anything() })
    );
  });
});
