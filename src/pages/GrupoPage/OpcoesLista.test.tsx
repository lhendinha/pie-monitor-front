import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarOpcoesProcesso: vi.fn(),
  criarOpcaoProcesso: vi.fn(),
  atualizarOpcaoProcesso: vi.fn(),
  desativarOpcaoProcesso: vi.fn(),
  reativarOpcaoProcesso: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import OpcoesLista from "./OpcoesLista";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OpcoesLista", () => {
  it("mostra a lista depois de carregar, buscando tudo de uma vez (sem paginação -- ordem é por drag and drop)", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [{ tipo: "fase", opcao_id: "f1", rotulo: "Conhecimento", ordem: 1, ativo: true }],
      total: 1,
      total_paginas: 1,
    });
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    expect(await screen.findByText("Conhecimento")).toBeInTheDocument();
    expect(mocks.listarOpcoesProcesso).toHaveBeenCalledWith("fase", { tamanhoPagina: 100 });
  });

  it("cria uma opção nova usando o total real (não o tamanho da página atual) como ordem", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 12, total_paginas: 2 });
    mocks.criarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    await screen.findByText("Nenhuma opção ainda.");
    await user.type(screen.getByLabelText("Nova opção"), "Recursal");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    // total=12 (não opcoes.length, que seria 0 nessa página) -- achado da
    // revisão: usar o tamanho da página atual daria ordem errada a partir
    // da 2ª página em diante.
    await waitFor(() => expect(mocks.criarOpcaoProcesso).toHaveBeenCalledWith("fase", "Recursal", 13));
  });

  it("desativa uma opção ativa", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [{ tipo: "fase", opcao_id: "f1", rotulo: "Conhecimento", ordem: 1, ativo: true }],
      total: 1,
      total_paginas: 1,
    });
    mocks.desativarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    await screen.findByText("Conhecimento");
    await user.click(screen.getByTitle("Desativar"));

    await waitFor(() => expect(mocks.desativarOpcaoProcesso).toHaveBeenCalledWith("fase", "f1"));
  });

  it("reativa uma opção inativa (lista de admin mostra inativas também)", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [{ tipo: "fase", opcao_id: "f1", rotulo: "Especiais", ordem: 1, ativo: false }],
      total: 1,
      total_paginas: 1,
    });
    mocks.reativarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    expect(await screen.findByText("Especiais")).toBeInTheDocument();
    expect(screen.getByText("(Inativa)")).toBeInTheDocument();
    await user.click(screen.getByTitle("Reativar"));

    await waitFor(() => expect(mocks.reativarOpcaoProcesso).toHaveBeenCalledWith("fase", "f1"));
  });

  it("edita uma opção existente", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [{ tipo: "fase", opcao_id: "f1", rotulo: "Conhecimento", ordem: 1, ativo: true }],
      total: 1,
      total_paginas: 1,
    });
    mocks.atualizarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    await screen.findByText("Conhecimento");
    await user.click(screen.getByTitle("Editar"));

    const rotuloInput = await screen.findByLabelText("Rótulo");
    await user.clear(rotuloInput);
    await user.type(rotuloInput, "Conhecimento (editado)");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarOpcaoProcesso).toHaveBeenCalledWith("fase", "f1", "Conhecimento (editado)", 1)
    );
  });

  it("usa tipo 'situacao' quando montada pra Situações", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
    renderComProviders(<OpcoesLista tipo="situacao" titulo="Situações" />);

    await screen.findByText("Nenhuma opção ainda.");
    expect(mocks.listarOpcoesProcesso).toHaveBeenCalledWith("situacao", { tamanhoPagina: 100 });
  });
});
