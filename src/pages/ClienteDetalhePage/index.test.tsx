import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalheCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  removerCliente: vi.fn(),
  listarProcessos: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import ClienteDetalhePage from "./index";

const CLIENTE = {
  cliente_id: "c1",
  nome: "Construtora Alfa",
  cpf_cnpj: "12345678000195",
  telefone: "31988887777",
  email: "contato@alfa.test",
  processos: 2,
};

function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={["/clientes/c1"]}>
      <Routes>
        <Route path="/clientes" element={<div>lista de clientes</div>} />
        <Route path="/clientes/:clienteId" element={<ClienteDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.detalheCliente.mockResolvedValue(CLIENTE);
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [] });
});

describe("ClienteDetalhePage", () => {
  it("carrega o cliente pela URL -- sem depender da listagem", async () => {
    montar();

    expect(await screen.findByLabelText(/Nome/)).toHaveValue("Construtora Alfa");
    expect(mocks.detalheCliente).toHaveBeenCalledWith("c1");
  });

  it("reaplica as máscaras de documento e telefone ao abrir", async () => {
    // O backend guarda só dígitos; a máscara é exibição, e tem que voltar
    // quando o cliente é aberto pra edição.
    montar();

    expect(await screen.findByLabelText(/CPF\/CNPJ/)).toHaveValue("12.345.678/0001-95");
    expect(screen.getByLabelText(/Telefone/)).toHaveValue("(31) 98888-7777");
  });

  it("salvar envia só dígitos", async () => {
    mocks.atualizarCliente.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    const nome = await screen.findByLabelText(/Nome/);
    await user.clear(nome);
    await user.type(nome, "Construtora Beta");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarCliente).toHaveBeenCalledWith("c1", {
        nome: "Construtora Beta",
        cpfCnpj: "12345678000195",
        telefone: "31988887777",
        email: "contato@alfa.test",
      }),
    );
  });

  it("e-mail malformado bloqueia o salvar", async () => {
    const user = userEvent.setup();
    montar();

    const email = await screen.findByLabelText(/E-mail/);
    await user.clear(email);
    await user.type(email, "quebrado@");

    expect(await screen.findByText("E-mail inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("excluir pede confirmação no diálogo do sistema e volta pra listagem", async () => {
    // `window.confirm` não serve: é do navegador, não dá pra pôr o nome do
    // cliente em destaque nem avisar sobre os processos vinculados, e em
    // alguns navegadores dá pra silenciá-lo.
    mocks.removerCliente.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerCliente).toHaveBeenCalledWith("c1"));
    expect(await screen.findByText("lista de clientes")).toBeInTheDocument();
  });

  it("o diálogo avisa que os processos perdem o cliente", async () => {
    // Eles não somem junto -- ficam sem esse cliente.
    mocks.listarProcessos.mockResolvedValue({
      processos: [
        { subgrupo_id: "sg1", numero_processo: "00002668720218130559", apelido: "x" },
      ],
    });
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText(
        "Está vinculado a 1 processo, que continua existindo, mas perde esse cliente.",
      ),
    ).toBeInTheDocument();
  });

  it("cliente em uso por processo mostra a mensagem que a API deu", async () => {
    // O backend bloqueia (`ClienteEmUso`) pra não deixar `cliente_id` solto
    // apontando pra nada. A tela repassa o motivo, não inventa outro.
    mocks.removerCliente.mockRejectedValue(
      new ApiError("Cliente ainda vinculado a um processo", 409),
    );
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Cliente ainda vinculado a um processo")).toBeInTheDocument();
  });

  it("sem permissão de admin, não mostra o botão de excluir", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montar();
    await screen.findByLabelText(/Nome/);

    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("lista os processos vinculados", async () => {
    mocks.listarProcessos.mockResolvedValue({
      processos: [{ subgrupo_id: "sg1", numero_processo: "00002668720218130559", apelido: "" }],
    });
    montar();

    expect(await screen.findByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
    expect(mocks.listarProcessos).toHaveBeenCalledWith({ clienteId: "c1" });
  });

  it("sem processo vinculado, diz isso", async () => {
    montar();

    expect(
      await screen.findByText("Nenhum processo vinculado a este cliente."),
    ).toBeInTheDocument();
  });

  it("'Voltar' devolve pra listagem", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: /Voltar/ }));

    expect(await screen.findByText("lista de clientes")).toBeInTheDocument();
  });
});
