import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarProcessos: vi.fn(),
  removerProcesso: vi.fn(),
  listarSubgrupos: vi.fn(),
  criarProcesso: vi.fn(),
  atualizarProcesso: vi.fn(),
  listarClientes: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  detalhesProcesso: vi.fn(),
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
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [] });
  mocks.detalhesProcesso.mockResolvedValue({ comunicacoes: [] });
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

  it("cadastra processo com os campos novos preenchidos", async () => {
    mocks.criarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByRole("button", { name: "+ Novo Processo" }));

    await user.type(screen.getByLabelText("Número do processo"), "00002668720218130559");
    await user.type(screen.getByLabelText("Apelido (opcional)"), "Novo apelido");
    await user.type(screen.getByLabelText("Objeto/Assunto"), "Cobrança");
    await user.type(screen.getByLabelText("Próxima providência"), "Aguardar prazo");
    fireEvent.change(screen.getByLabelText("Data para verificar"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Prazo final"), { target: { value: "2026-12-15" } });
    await user.type(screen.getByLabelText("Observações"), "Obs teste");

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(mocks.criarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Novo apelido",
        expect.objectContaining({
          objetoAssunto: "Cobrança",
          proximaProvidencia: "Aguardar prazo",
          dataVerificar: "2026-12-01",
          prazoFinal: "2026-12-15",
          observacoes: "Obs teste",
        })
      )
    );
  });

  it("não tem mais botão de 'editar apelido' separado -- foi consolidado no modal novo", async () => {
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");
    expect(screen.queryByTitle("Editar apelido")).not.toBeInTheDocument();
  });

  it("clicar na linha abre o modal de edição e envia o PATCH com os campos editados", async () => {
    mocks.atualizarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByText("Meu processo"));

    const apelidoInput = await screen.findByLabelText("Apelido");
    await user.clear(apelidoInput);
    await user.type(apelidoInput, "Apelido editado");
    await user.type(screen.getByLabelText("Objeto/Assunto"), "Assunto editado");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarProcesso).toHaveBeenCalledWith(
        "sg1",
        "00002668720218130559",
        "Apelido editado",
        expect.objectContaining({ objetoAssunto: "Assunto editado" })
      )
    );
  });

  it("clicar em 'Ver histórico' não abre o modal de edição junto (clique não borbulha)", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByTitle("Ver histórico"));

    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
  });

  it("clicar em 'Remover' não abre o modal de edição junto (clique não borbulha)", async () => {
    mocks.removerProcesso.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByTitle("Remover"));

    await waitFor(() => expect(mocks.removerProcesso).toHaveBeenCalled());
    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
  });
});
