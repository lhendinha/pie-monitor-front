import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarClientes: vi.fn(),
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  removerCliente: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import ClientesPage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
});

describe("ClientesPage", () => {
  it("mostra a lista depois de carregar, com pagina/tamanhoPagina", async () => {
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "1", nome: "Fulano" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<ClientesPage />);
    expect(await screen.findByText("Fulano")).toBeInTheDocument();
    expect(mocks.listarClientes).toHaveBeenCalledWith({ pagina: 1, tamanhoPagina: 10 });
  });

  it("busca troca os parâmetros pra {busca} (ignora pagina/tamanhoPagina) e some a paginação", async () => {
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "1", nome: "Fulano" }], total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);
    await screen.findByText("Fulano");

    await user.type(screen.getByLabelText("Buscar"), "fulano");

    await waitFor(() => expect(mocks.listarClientes).toHaveBeenCalledWith({ busca: "fulano" }));
    expect(screen.queryByLabelText("Por página")).not.toBeInTheDocument();
  });

  it("busca sem resultado mostra a mensagem específica de busca vazia", async () => {
    mocks.listarClientes.mockImplementation((opcoes: { busca?: string }) =>
      Promise.resolve(
        opcoes.busca
          ? { clientes: [], total: 0, total_paginas: 0 }
          : { clientes: [{ cliente_id: "1", nome: "Fulano" }], total: 1, total_paginas: 1 }
      )
    );
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);
    await screen.findByText("Fulano");

    await user.type(screen.getByLabelText("Buscar"), "ninguem com esse nome");

    expect(await screen.findByText("Nenhum cliente encontrado pra essa busca.")).toBeInTheDocument();
  });

  it("botão '+ Novo Cliente' abre modal com máscara de CPF/CNPJ e telefone na digitação, mas envia só dígitos", async () => {
    mocks.listarClientes.mockResolvedValue({ clientes: [], total: 0, total_paginas: 0 });
    mocks.criarCliente.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);

    await screen.findByText("Nenhum cliente ainda.");
    await user.click(screen.getByRole("button", { name: "+ Novo Cliente" }));

    await user.type(screen.getByLabelText("Nome"), "Beltrano");
    const cpfInput = screen.getByLabelText("CPF/CNPJ (opcional)");
    await user.type(cpfInput, "12345678901");
    expect(cpfInput).toHaveValue("123.456.789-01"); // mascarado na tela...
    const telefoneInput = screen.getByLabelText("Telefone (opcional)");
    await user.type(telefoneInput, "11987654321");
    expect(telefoneInput).toHaveValue("(11) 98765-4321");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    // ...mas o backend recebe só dígitos (mesmo padrão de mascararNumeroProcesso).
    await waitFor(() =>
      expect(mocks.criarCliente).toHaveBeenCalledWith({
        nome: "Beltrano",
        cpfCnpj: "12345678901",
        telefone: "11987654321",
        email: "",
      })
    );
  });

  it("edita um cliente existente, reaplicando a máscara ao abrir e enviando só dígitos ao salvar", async () => {
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "1", nome: "Fulano", cpf_cnpj: "12345678901", telefone: "11987654321" }],
      total: 1, total_paginas: 1,
    });
    mocks.atualizarCliente.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);

    await screen.findByText("Fulano");
    await user.click(screen.getByTitle("Editar"));

    const nomeInput = await screen.findByLabelText("Nome");
    expect(screen.getByLabelText("CPF/CNPJ")).toHaveValue("123.456.789-01"); // mascarado a partir do dado salvo
    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 98765-4321");
    await user.clear(nomeInput);
    await user.type(nomeInput, "Fulano Editado");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarCliente).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({ nome: "Fulano Editado", cpfCnpj: "12345678901", telefone: "11987654321" })
      )
    );
  });

  it("remove um cliente e invalida a listagem", async () => {
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "1", nome: "Fulano" }], total: 1, total_paginas: 1,
    });
    mocks.removerCliente.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);

    await screen.findByText("Fulano");
    await user.click(screen.getByTitle("Remover"));

    await waitFor(() => expect(mocks.removerCliente).toHaveBeenCalledWith("1"));
  });

  it("erro ao remover cliente em uso por um processo mostra a mensagem da ApiError", async () => {
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "1", nome: "Fulano" }], total: 1, total_paginas: 1,
    });
    mocks.removerCliente.mockRejectedValue(
      new ApiError("Cliente está associado a pelo menos 1 processo -- remova essa associação antes de excluir", 409)
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);

    await screen.findByText("Fulano");
    await user.click(screen.getByTitle("Remover"));

    expect(
      await screen.findByText("Cliente está associado a pelo menos 1 processo -- remova essa associação antes de excluir")
    ).toBeInTheDocument();
  });

  it("erro ao criar mostra a mensagem da ApiError e marca o campo inválido", async () => {
    mocks.listarClientes.mockResolvedValue({ clientes: [], total: 0, total_paginas: 0 });
    mocks.criarCliente.mockRejectedValue(new ApiError("Cliente inválido", 400));
    const user = userEvent.setup();
    renderComProviders(<ClientesPage />);

    await screen.findByText("Nenhum cliente ainda.");
    await user.click(screen.getByRole("button", { name: "+ Novo Cliente" }));
    await user.type(screen.getByLabelText("Nome"), "X");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Cliente inválido")).toBeInTheDocument();
  });

  it("sem permissão (papelAtende falso), não mostra o botão de criar nem os ícones de editar/remover", async () => {
    mocks.papelAtende.mockReturnValue(false);
    mocks.listarClientes.mockResolvedValue({
      clientes: [{ cliente_id: "1", nome: "Fulano" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<ClientesPage />);

    await screen.findByText("Fulano");
    expect(screen.queryByRole("button", { name: "+ Novo Cliente" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Editar")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Remover")).not.toBeInTheDocument();
  });
});
