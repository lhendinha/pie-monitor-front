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

import OpcoesLista, { calcularOrdemAposMover } from "./OpcoesLista";
import type { OpcaoProcesso } from "../../types";

beforeEach(() => {
  vi.clearAllMocks();
});

function opcao(ordem: number): OpcaoProcesso {
  return { tipo: "fase", opcao_id: `o${ordem}`, rotulo: `Opção ${ordem}`, ordem, ativo: true };
}

describe("calcularOrdemAposMover (Bloco H -- ordem fracionária)", () => {
  it("com os dois vizinhos, usa o ponto médio", () => {
    expect(calcularOrdemAposMover(opcao(1), opcao(3))).toBe(2);
  });

  it("movido pro início (sem vizinho anterior), usa o seguinte - 1", () => {
    expect(calcularOrdemAposMover(undefined, opcao(5))).toBe(4);
  });

  it("movido pro fim (sem vizinho seguinte), usa o anterior + 1", () => {
    expect(calcularOrdemAposMover(opcao(5), undefined)).toBe(6);
  });

  it("lista vazia (sem nenhum vizinho), usa 1", () => {
    expect(calcularOrdemAposMover(undefined, undefined)).toBe(1);
  });
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

  it("cria uma opção nova usando a maior ordem em memória (não o total), 1 acima do maior valor existente", async () => {
    // ordem fracionária (Bloco H): depois de reordenações, o maior `ordem`
    // em memória pode já estar acima da contagem de itens (`total`) --
    // usar `total + 1` nasceria empatado ou atrás do último item de verdade.
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [{ tipo: "fase", opcao_id: "f1", rotulo: "Conhecimento", ordem: 1, ativo: true },
               { tipo: "fase", opcao_id: "f2", rotulo: "Recursal", ordem: 30, ativo: true }],
      total: 2,
      total_paginas: 1,
    });
    mocks.criarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    await screen.findByText("Recursal");
    await user.type(screen.getByLabelText("Nova opção"), "Nova");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(mocks.criarOpcaoProcesso).toHaveBeenCalledWith("fase", "Nova", 31));
  });

  it("cria a 1ª opção da lista com ordem 1", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
    mocks.criarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<OpcoesLista tipo="fase" titulo="Fases" />);

    await screen.findByText("Nenhuma opção ainda.");
    await user.type(screen.getByLabelText("Nova opção"), "Recursal");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(mocks.criarOpcaoProcesso).toHaveBeenCalledWith("fase", "Recursal", 1));
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
