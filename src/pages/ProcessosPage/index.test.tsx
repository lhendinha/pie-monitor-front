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

  it("busca troca os parâmetros (ignora pagina/tamanhoPagina) -- texto livre, não só número", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.type(screen.getByLabelText("Buscar"), "cobrança de honorários");

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith({
        busca: "cobrança de honorários",
        clienteId: "",
        faseId: "",
        situacaoId: "",
        dataVerificarAte: "",
        prazoFinalAte: "",
      })
    );
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

  it("mostra tags de fase/situação/data no card quando o processo tem esses campos", async () => {
    mocks.listarProcessos.mockResolvedValue({
      processos: [{
        ...PROCESSO,
        fase_id: "fase-1", situacao_id: "sit-1", data_verificar: "2026-08-25", prazo_final: "2026-09-01",
      }],
      total: 1, total_paginas: 1,
    });
    mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
      Promise.resolve({
        opcoes: tipo === "fase"
          ? [{ opcao_id: "fase-1", tipo: "fase", rotulo: "Conhecimento (1º Grau)", ordem: 1, ativo: true }]
          : [{ opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true }],
      })
    );

    renderComProviders(<ProcessosPage />);

    expect(await screen.findByText("Conhecimento (1º Grau)")).toBeInTheDocument();
    expect(screen.getByText("Aguardando sentença")).toBeInTheDocument();
    expect(screen.getByText("Verificar 25/08/2026")).toBeInTheDocument();
    expect(screen.getByText("Prazo 01/09/2026")).toBeInTheDocument();
  });

  it("painel de Filtros abre/fecha via classe 'aberto' ao clicar no botão", async () => {
    const user = userEvent.setup();
    const { container } = renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    const botaoFiltros = screen.getByRole("button", { name: "Filtros" });
    const painel = container.querySelector(".filtros-painel");
    expect(painel).not.toHaveClass("aberto");

    await user.click(botaoFiltros);
    expect(painel).toHaveClass("aberto");

    await user.click(botaoFiltros);
    expect(painel).not.toHaveClass("aberto");
  });

  it("aplicar filtro de data cria chip, filtra a lista e some ao remover o chip", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByLabelText("Data p/ verificar (até)"), { target: { value: "2026-08-31" } });
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ dataVerificarAte: "2026-08-31" })
      )
    );
    expect(screen.getByRole("button", { name: "Filtros (1)" })).toBeInTheDocument();
    expect(screen.getByText(/Verificar até: 31\/08\/2026/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Remover filtro Verificar até/ }));

    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith({ pagina: 1, tamanhoPagina: 10 })
    );
    expect(screen.queryByText(/Verificar até:/)).not.toBeInTheDocument();
  });

  it("'Limpar' no painel zera todos os filtros aplicados", async () => {
    const user = userEvent.setup();
    renderComProviders(<ProcessosPage />);
    await screen.findByText("Meu processo");

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByLabelText("Prazo final (até)"), { target: { value: "2026-09-01" } });
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Filtros (1)" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Filtros (1)" }));
    await user.click(screen.getByRole("button", { name: "Limpar" }));

    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.listarProcessos).toHaveBeenLastCalledWith({ pagina: 1, tamanhoPagina: 10 })
    );
  });
});
