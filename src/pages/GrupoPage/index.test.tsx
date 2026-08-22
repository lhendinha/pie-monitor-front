import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  papelAtende: vi.fn(),
  listarSubgrupos: vi.fn(),
  criarSubgrupo: vi.fn(),
  removerSubgrupo: vi.fn(),
  listarMembrosDoGrupo: vi.fn(),
  listarGrupos: vi.fn(),
  ehSuperAdmin: vi.fn(),
  listarSubgruposDoGrupo: vi.fn(),
  atualizarMembro: vi.fn(),
  getGrupoId: vi.fn(),
  criarConvite: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  adicionarMembro: vi.fn(),
  removerMembro: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  criarOpcaoProcesso: vi.fn(),
  atualizarOpcaoProcesso: vi.fn(),
  desativarOpcaoProcesso: vi.fn(),
  reativarOpcaoProcesso: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import GrupoPage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
  mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [] });
  mocks.listarGrupos.mockResolvedValue({ grupos: [] });
  mocks.ehSuperAdmin.mockReturnValue(false);
  mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [], total: 0, total_paginas: 0 });
});

describe("GrupoPage", () => {
  it("tem título e subtítulo próprios, como toda tela", async () => {
    mocks.papelAtende.mockReturnValue(true);
    renderComProviders(<GrupoPage />);

    expect(screen.getByRole("heading", { name: "Grupo" })).toBeInTheDocument();
    expect(screen.getByText("Gestão de definições do grupo.")).toBeInTheDocument();
  });

  it("papel 'user' (só Subgrupos habilitado) mostra Subgrupos direto, sem sub-nav de outras abas", async () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user");
    renderComProviders(<GrupoPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    expect(screen.queryByRole("tab", { name: "Membros" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fases" })).not.toBeInTheDocument();
  });

  it("papel 'manager' vê Subgrupos e Membros, clicar em Membros troca o conteúdo", async () => {
    mocks.papelAtende.mockImplementation((minimo: string) => minimo === "user" || minimo === "manager");
    const user = userEvent.setup();
    renderComProviders(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    expect(screen.getByRole("tab", { name: "Membros" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Convidar" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Membros" }));
    expect(mocks.listarMembrosDoGrupo).toHaveBeenCalled();
  });

  it("papel 'admin' vê Fases e Situações -- o piso desceu de super_admin", async () => {
    // Este caso não existia, e era exatamente o que estava quebrado: as rotas
    // de Fase/Situação passaram a exigir `admin`, o `SUB_ABAS` continuou em
    // `super_admin`, e o admin ficou com a permissão no servidor sem ver as
    // abas. Ninguém tomava 403 -- a funcionalidade simplesmente sumia.
    mocks.papelAtende.mockImplementation(
      (minimo: string) => minimo !== "super_admin",
    );
    renderComProviders(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    for (const nome of ["Membros", "Convidar", "Fases", "Situações"]) {
      expect(screen.getByRole("tab", { name: nome })).toBeInTheDocument();
    }
  });

  it("papel 'super_admin' vê as 5 sub-abas, incluindo Fases/Situações", async () => {
    mocks.papelAtende.mockReturnValue(true);
    renderComProviders(<GrupoPage />);

    await screen.findByRole("tab", { name: "Subgrupos" });
    for (const nome of ["Membros", "Convidar", "Fases", "Situações"]) {
      expect(screen.getByRole("tab", { name: nome })).toBeInTheDocument();
    }
  });
});
