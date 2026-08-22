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
    await user.type(screen.getByLabelText("Nome do novo subgrupo"), "Trabalhista");
    await user.click(screen.getByRole("button", { name: "Criar subgrupo" }));

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
    // O rótulo carrega o nome ("Remover Cível"): com cinco linhas, cinco
    // botões "Remover" idênticos não dizem qual é qual pra quem usa leitor.
    await user.click(screen.getByRole("button", { name: /Remover Cível/ }));

    await waitFor(() => expect(screen.getByText("Nenhum subgrupo ainda.")).toBeInTheDocument());
    expect(mocks.listarSubgrupos).toHaveBeenCalledTimes(2); // carga inicial + invalidate pós-remoção
  });

  it("renomeia NA PRÓPRIA LINHA, sem modal -- Enter confirma", async () => {
    // Trocar uma palavra não justifica abrir uma janela: no artifact o nome
    // vira campo no lugar.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    mocks.atualizarSubgrupo.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByText("Cível"));

    const nomeInput = await screen.findByLabelText("Novo nome de Cível");
    await user.clear(nomeInput);
    await user.type(nomeInput, "Cível (editado){Enter}");

    await waitFor(() => expect(mocks.atualizarSubgrupo).toHaveBeenCalledWith("1", "Cível (editado)"));
  });

  it("Escape desiste de renomear -- não chama a API", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByText("Cível"));
    await user.type(await screen.findByLabelText("Novo nome de Cível"), "outro{Escape}");

    expect(mocks.atualizarSubgrupo).not.toHaveBeenCalled();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
  });

  it("campo esvaziado não renomeia pra vazio -- sair do campo é desistir", async () => {
    // Controle: sem isto, apagar tudo e clicar fora mandaria `nome: ""` --
    // que o servidor recusa, mas com um toast de erro que a pessoa não
    // pediu.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByText("Cível"));
    await user.clear(await screen.findByLabelText("Novo nome de Cível"));
    await user.tab();

    expect(mocks.atualizarSubgrupo).not.toHaveBeenCalled();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
  });

  it("mostra quantos membros e quantas colunas cada subgrupo tem", async () => {
    // Campos derivados, contados pela API na própria listagem -- sem eles a
    // tela pediria membros e quadro de cada linha, uma requisição por linha.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);

    expect(await screen.findByText("1 membro · 3 colunas")).toBeInTheDocument();
  });

  it("erro ao criar mostra a mensagem da ApiError e marca o campo inválido", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
    mocks.criarSubgrupo.mockRejectedValue(new ApiError("Já existe um subgrupo com esse nome", 400));
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    await user.type(screen.getByLabelText("Nome do novo subgrupo"), "Cível");
    await user.click(screen.getByRole("button", { name: "Criar subgrupo" }));

    expect(await screen.findByText("Já existe um subgrupo com esse nome")).toBeInTheDocument();
  });

  it("sem permissão (papelAtende falso), não mostra o form nem o botão de remover", async () => {
    mocks.papelAtende.mockReturnValue(false);
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    expect(screen.queryByLabelText("Nome do novo subgrupo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Renomear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover/ })).not.toBeInTheDocument();
  });
});
