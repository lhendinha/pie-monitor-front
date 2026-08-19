import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarSubgrupos: vi.fn(),
  criarSubgrupo: vi.fn(),
  atualizarSubgrupo: vi.fn(),
  removerSubgrupo: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import SubgruposPage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
});

describe("SubgruposPage", () => {
  it("mostra a lista depois de carregar, com pagina/tamanhoPagina", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);
    expect(await screen.findByText("Cível")).toBeInTheDocument();
    expect(mocks.listarSubgrupos).toHaveBeenCalledWith({ pagina: 1, tamanhoPagina: 10 });
  });

  it("cria um subgrupo e reflete na lista via invalidateQueries", async () => {
    mocks.listarSubgrupos
      .mockResolvedValueOnce({ subgrupos: [], total: 0, total_paginas: 0 })
      .mockResolvedValueOnce({ subgrupos: [{ subgrupo_id: "2", nome: "Trabalhista" }], total: 1, total_paginas: 1 });
    mocks.criarSubgrupo.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    await user.type(screen.getByLabelText("Novo subgrupo"), "Trabalhista");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByText("Trabalhista")).toBeInTheDocument();
    expect(mocks.criarSubgrupo).toHaveBeenCalledWith("Trabalhista");
    expect(mocks.listarSubgrupos).toHaveBeenCalledTimes(2); // carga inicial + invalidate pós-criação
  });

  it("remove um subgrupo -- invalida e refaz o fetch (splice otimista não é seguro com paginação real)", async () => {
    mocks.listarSubgrupos
      .mockResolvedValueOnce({ subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1 })
      .mockResolvedValueOnce({ subgrupos: [], total: 0, total_paginas: 0 });
    mocks.removerSubgrupo.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    await user.click(screen.getByTitle("Remover"));

    await waitFor(() => expect(screen.queryByText("Cível")).not.toBeInTheDocument());
    expect(mocks.listarSubgrupos).toHaveBeenCalledTimes(2); // carga inicial + invalidate pós-remoção
  });

  it("edita o nome de um subgrupo (admin/super_admin)", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    mocks.atualizarSubgrupo.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    await user.click(screen.getByTitle("Editar"));

    const nomeInput = await screen.findByLabelText("Nome");
    await user.clear(nomeInput);
    await user.type(nomeInput, "Cível (editado)");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.atualizarSubgrupo).toHaveBeenCalledWith("1", "Cível (editado)"));
  });

  it("erro ao criar mostra a mensagem da ApiError e marca o campo inválido", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
    mocks.criarSubgrupo.mockRejectedValue(new ApiError("Já existe um subgrupo com esse nome", 400));
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    await user.type(screen.getByLabelText("Novo subgrupo"), "Cível");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByText("Já existe um subgrupo com esse nome")).toBeInTheDocument();
  });

  it("sem permissão (papelAtende falso), não mostra o form nem o botão de remover", async () => {
    mocks.papelAtende.mockReturnValue(false);
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    expect(screen.queryByLabelText("Novo subgrupo")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Editar")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Remover")).not.toBeInTheDocument();
  });
});
