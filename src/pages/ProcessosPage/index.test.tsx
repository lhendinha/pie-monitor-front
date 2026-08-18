import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarProcessos: vi.fn(),
  removerProcesso: vi.fn(),
  listarSubgrupos: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ProcessosPage from "./index";

const PROCESSO = {
  subgrupo_id: "sg1",
  numero_processo: "00002668720218130559",
  apelido: "Meu processo",
  ultima_verificacao: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [{ subgrupo_id: "sg1", nome: "Cível" }] });
  mocks.listarProcessos.mockResolvedValue({ processos: [PROCESSO], total: 1, total_paginas: 1 });
});

describe("ProcessosPage", () => {
  it("mostra a lista de processos depois de carregar, com pagina/tamanhoPagina", async () => {
    renderComProviders(<ProcessosPage />);
    expect(await screen.findByText("Meu processo")).toBeInTheDocument();
    expect(mocks.listarProcessos).toHaveBeenCalledWith({ pagina: 1, tamanhoPagina: 10 });
  });

  it("busca troca os parâmetros pra {busca} (ignora pagina/tamanhoPagina), depois do debounce", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.type(screen.getByLabelText("Buscar por número"), "1234");

    await waitFor(() => expect(mocks.listarProcessos).toHaveBeenCalledWith({ busca: "1234" }), {
      timeout: 2000,
    });
  });

  it("remover um processo invalida só 'processos' -- não refaz o fetch de subgrupos", async () => {
    mocks.removerProcesso.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);

    await screen.findByText("Meu processo");
    const chamadasSubgruposAntes = mocks.listarSubgrupos.mock.calls.length;

    await user.click(screen.getByTitle("Remover"));

    await waitFor(() => expect(mocks.listarProcessos).toHaveBeenCalledTimes(2)); // inicial + invalidate pós-remoção
    expect(mocks.listarSubgrupos.mock.calls.length).toBe(chamadasSubgruposAntes);
    expect(mocks.removerProcesso).toHaveBeenCalledWith("sg1", "00002668720218130559");
  });

  it("mostra 'Nenhum processo cadastrado ainda.' quando a lista vem vazia", async () => {
    mocks.listarProcessos.mockResolvedValue({ processos: [], total: 0, total_paginas: 0 });
    renderComProviders(<ProcessosPage />);
    expect(await screen.findByText("Nenhum processo cadastrado ainda.")).toBeInTheDocument();
  });
});
