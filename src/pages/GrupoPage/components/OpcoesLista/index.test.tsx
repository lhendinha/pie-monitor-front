import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarOpcoesProcesso: vi.fn(),
  criarOpcaoProcesso: vi.fn(),
  atualizarOpcaoProcesso: vi.fn(),
  desativarOpcaoProcesso: vi.fn(),
  reativarOpcaoProcesso: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import OpcoesLista from "./index";

function montar(tipo: "fase" | "situacao" = "fase") {
  return renderComProviders(
    tipo === "fase" ? (
      <OpcoesLista tipo="fase" titulo="Fases" nomeSingular="fase" />
    ) : (
      <OpcoesLista tipo="situacao" titulo="Situações" nomeSingular="situação" />
    ),
  );
}

const CONHECIMENTO = {
  tipo: "fase" as const,
  opcao_id: "f1",
  rotulo: "Conhecimento",
  ordem: 1,
  ativo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.listarOpcoesProcesso.mockResolvedValue({
    opcoes: [CONHECIMENTO],
    total: 1,
    total_paginas: 1,
  });
});

describe("OpcoesLista", () => {
  it("busca tudo de uma vez -- não dá pra arrastar entre páginas", async () => {
    montar();

    expect(await screen.findByText("Conhecimento")).toBeInTheDocument();
    expect(mocks.listarOpcoesProcesso).toHaveBeenCalledWith("fase", { tamanhoPagina: 100 });
  });

  it("cria usando a maior ordem em memória, e não o total", async () => {
    // `ordem` é fracionária: depois de reordenar, o maior valor em memória
    // pode já estar acima da contagem de itens -- `total + 1` nasceria
    // empatado ou atrás do que deveria ser o último.
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [CONHECIMENTO, { ...CONHECIMENTO, opcao_id: "f2", rotulo: "Recursal", ordem: 30 }],
      total: 2,
      total_paginas: 1,
    });
    mocks.criarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await screen.findByText("Recursal");
    await user.type(screen.getByLabelText("Nova fase"), "Execução");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => expect(mocks.criarOpcaoProcesso).toHaveBeenCalledWith("fase", "Execução", 31));
  });

  it("cria a primeira opção da lista com ordem 1", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
    mocks.criarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await screen.findByText("Nenhuma opção ainda.");
    await user.type(screen.getByLabelText("Nova fase"), "Recursal");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => expect(mocks.criarOpcaoProcesso).toHaveBeenCalledWith("fase", "Recursal", 1));
  });

  it("renomeia NA PRÓPRIA LINHA, e manda só o rótulo", async () => {
    // Só o rótulo: reenviar a `ordem` sobrescreveria um arrastar concorrente
    // com um valor possivelmente desatualizado.
    mocks.atualizarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByText("Conhecimento"));
    const campo = await screen.findByLabelText("Novo rótulo de Conhecimento");
    await user.clear(campo);
    await user.type(campo, "Conhecimento (1º grau){Enter}");

    await waitFor(() =>
      expect(mocks.atualizarOpcaoProcesso).toHaveBeenCalledWith("fase", "f1", "Conhecimento (1º grau)"),
    );
  });

  it("desativar pede confirmação, e o diálogo diz que nada se perde", async () => {
    // O medo aqui é perder dado. Como não é isso que acontece, o diálogo é
    // reversível: sem lixeira e sem "não pode ser desfeita".
    mocks.desativarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Desativar Conhecimento" }));

    const dialogo = within(await screen.findByRole("dialog"));
    expect(
      dialogo.getByText(
        "Os processos que já usam essa opção continuam mostrando o valor. Nada é perdido.",
      ),
    ).toBeInTheDocument();
    expect(dialogo.queryByText("Essa ação não pode ser desfeita.")).not.toBeInTheDocument();

    await user.click(dialogo.getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(mocks.desativarOpcaoProcesso).toHaveBeenCalledWith("fase", "f1"));
  });

  it("reativa uma inativa -- esta lista mostra as duas", async () => {
    // O seletor do processo só mostra ativas; aqui a inativa precisa
    // aparecer, senão não há como trazê-la de volta.
    mocks.listarOpcoesProcesso.mockResolvedValue({
      opcoes: [{ ...CONHECIMENTO, rotulo: "Especiais", ativo: false }],
      total: 1,
      total_paginas: 1,
    });
    mocks.reativarOpcaoProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    expect(await screen.findByText("Especiais")).toBeInTheDocument();
    // Cor E texto: cinza sozinho não conta a história pra quem não o
    // distingue.
    expect(screen.getByText("(Inativa)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reativar Especiais" }));

    await waitFor(() => expect(mocks.reativarOpcaoProcesso).toHaveBeenCalledWith("fase", "f1"));
  });

  it("sem admin, a lista é só leitura e diz por quê", async () => {
    // Piso de POST/PATCH/DELETE de fases e situações.
    mocks.papelAtende.mockReturnValue(false);
    montar();

    expect(await screen.findByText("Conhecimento")).toBeInTheDocument();
    expect(
      screen.getByText("Só admin e super admin podem gerenciar fases."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova fase")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Renomear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Desativar/ })).not.toBeInTheDocument();
  });

  it("montada pra Situações, fala de situação", async () => {
    mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
    montar("situacao");

    await screen.findByText("Nenhuma opção ainda.");
    expect(screen.getByLabelText("Nova situação")).toBeInTheDocument();
    expect(mocks.listarOpcoesProcesso).toHaveBeenCalledWith("situacao", { tamanhoPagina: 100 });
  });
});
