import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarClientes: vi.fn(),
  criarCliente: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import ClientesPage from "./index";

/** Marca onde a navegação parou, sem montar o detalhe inteiro -- o que este
 * arquivo testa é a listagem. */
function EspiaoDeRota() {
  const { clienteId } = useParams();
  return <div>{`detalhe ${clienteId}`}</div>;
}

function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={["/clientes"]}>
      <Routes>
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:clienteId" element={<EspiaoDeRota />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.listarClientes.mockResolvedValue({
    clientes: [
      {
        cliente_id: "1",
        nome: "Fulano",
        cpf_cnpj: "12345678901",
        processos: 3,
      },
    ],
    total: 1,
    total_paginas: 1,
  });
});

describe("ClientesPage", () => {
  it("mostra a lista depois de carregar, com pagina/tamanhoPagina", async () => {
    montar();

    expect(await screen.findByText("Fulano")).toBeInTheDocument();
    expect(mocks.listarClientes).toHaveBeenCalledWith({
      pagina: 1,
      tamanhoPagina: 10,
    });
  });

  it("mostra quantos processos cada cliente tem", async () => {
    // Campo derivado, calculado pela API -- sem ele a tela teria que pedir
    // `GET /processos?cliente_id=X` por linha.
    montar();

    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("deduz pessoa física ou jurídica pelo tamanho do documento", async () => {
    montar();

    expect(await screen.findByText("Pessoa física")).toBeInTheDocument();
  });

  it("busca troca os parâmetros pra {busca} e some a paginação", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    await user.type(screen.getByLabelText("Pesquisar cliente"), "ciclana");

    await waitFor(() =>
      expect(mocks.listarClientes).toHaveBeenCalledWith({ busca: "ciclana" }),
    );
    expect(screen.queryByText("Por página")).not.toBeInTheDocument();
  });

  it("busca sem resultado mostra a mensagem específica de busca vazia", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    mocks.listarClientes.mockResolvedValue({
      clientes: [],
      total: 0,
      total_paginas: 0,
    });
    await user.type(screen.getByLabelText("Pesquisar cliente"), "zzz");

    expect(
      await screen.findByText("Nenhum cliente para “zzz”."),
    ).toBeInTheDocument();
  });

  it("clicar na linha NAVEGA pro detalhe", async () => {
    // O detalhe deixou de ser modal: é rota, pelo mesmo motivo do detalhe
    // de processo -- precisa sobreviver a um F5 e a um link colado.
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByText("Fulano"));

    expect(await screen.findByText("detalhe 1")).toBeInTheDocument();
  });

  it("a linha abre pelo teclado -- Enter na linha focada", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    screen.getByText("Fulano").closest("tr")!.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("detalhe 1")).toBeInTheDocument();
  });

  it("cadastra com máscara na digitação, mas envia só dígitos", async () => {
    mocks.criarCliente.mockResolvedValue({});
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    await user.click(screen.getByRole("button", { name: "+ Novo cliente" }));
    await user.type(await screen.findByLabelText(/Nome/), "Ciclano");
    await user.type(screen.getByLabelText(/CPF\/CNPJ/), "12345678901");
    await user.type(screen.getByLabelText(/Telefone/), "31988887777");

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(mocks.criarCliente).toHaveBeenCalledWith({
        nome: "Ciclano",
        cpfCnpj: "12345678901",
        telefone: "31988887777",
        email: "",
        // O bloco vai INTEIRO, mesmo em branco -- ver o gêmeo em
        // `ClienteDetalhePage`.
        endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
      }),
    );
  });

  it("e-mail malformado bloqueia o cadastro e avisa na hora", async () => {
    // O servidor recusa do mesmo jeito (`EmailInvalido`); isto é pra a
    // pessoa não preencher o formulário inteiro pra tomar erro no fim.
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    await user.click(screen.getByRole("button", { name: "+ Novo cliente" }));
    await user.type(await screen.findByLabelText(/Nome/), "Ciclano");
    await user.type(screen.getByLabelText(/E-mail/), "isso-nao-e-email");

    expect(await screen.findByText("E-mail inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled();
    expect(mocks.criarCliente).not.toHaveBeenCalled();
  });

  it("e-mail vazio não é erro -- o campo é opcional", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    await user.click(screen.getByRole("button", { name: "+ Novo cliente" }));
    await user.type(await screen.findByLabelText(/Nome/), "Ciclano");

    expect(screen.queryByText("E-mail inválido.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeEnabled();
  });

  it("erro ao criar mostra a mensagem da ApiError", async () => {
    mocks.criarCliente.mockRejectedValue(
      // `ApiError(mensagem, status)` -- nessa ordem.
      new ApiError("Esse CPF/CNPJ já é de outro cliente", 409),
    );
    const user = userEvent.setup();
    montar();
    await screen.findByText("Fulano");

    await user.click(screen.getByRole("button", { name: "+ Novo cliente" }));
    await user.type(await screen.findByLabelText(/Nome/), "Ciclano");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(
      await screen.findByText("Esse CPF/CNPJ já é de outro cliente"),
    ).toBeInTheDocument();
  });

  it("sem permissão de manager, não mostra o botão de criar", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montar();
    await screen.findByText("Fulano");

    expect(
      screen.queryByRole("button", { name: "+ Novo cliente" }),
    ).not.toBeInTheDocument();
  });
});
