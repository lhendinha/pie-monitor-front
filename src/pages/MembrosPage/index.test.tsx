import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarMembrosDoGrupo: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarGrupos: vi.fn(),
  ehSuperAdmin: vi.fn(),
  listarSubgruposDoGrupo: vi.fn(),
  atualizarMembro: vi.fn(),
  getGrupoId: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import MembrosPage from "./index";

const PESSOA = {
  email: "ana@argos.local",
  apelido: "Ana Paula",
  papel: "admin" as const,
  subgrupos: ["s1"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ehSuperAdmin.mockReturnValue(true);
  mocks.getGrupoId.mockReturnValue("g1");
  mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [PESSOA] });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [{ subgrupo_id: "s1", nome: "Cível" }],
  });
  mocks.listarSubgruposDoGrupo.mockResolvedValue({
    subgrupos: [{ subgrupo_id: "s1", nome: "Cível" }],
  });
  mocks.listarGrupos.mockResolvedValue({ grupos: [{ grupo_id: "g1", nome: "Escritório" }] });
});

describe("MembrosPage", () => {
  it("lista as pessoas do grupo com papel e subgrupos", async () => {
    renderComProviders(<MembrosPage />);

    expect(await screen.findByText("Ana Paula")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    // Nome do subgrupo, e não o id: `membro.subgrupos` traz ids, e id não
    // diz nada pra quem lê.
    expect(screen.getAllByText("Cível").length).toBeGreaterThan(0);
  });

  it("sem apelido, o e-mail ocupa a primeira coluna", async () => {
    // Célula em branco na primeira coluna faz a linha parecer defeito.
    mocks.listarMembrosDoGrupo.mockResolvedValue({
      membros: [{ ...PESSOA, apelido: undefined }],
    });
    renderComProviders(<MembrosPage />);

    const linha = (await screen.findAllByRole("row")).find((r) =>
      r.textContent?.includes("ana@argos.local"),
    )!;
    expect(within(linha).getAllByText("ana@argos.local").length).toBe(2);
  });

  it("clicar na linha abre a edição -- super admin", async () => {
    const user = userEvent.setup();
    renderComProviders(<MembrosPage />);

    await user.click(await screen.findByText("Ana Paula"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Apelido")).toHaveValue("Ana Paula");
  });

  it("sem ser super admin, a linha não abre e a tela diz por quê", async () => {
    // O piso é o do `PATCH /grupos/membros/{email}`. Uma tabela que
    // simplesmente não reage ao clique parece quebrada.
    mocks.ehSuperAdmin.mockReturnValue(false);
    const user = userEvent.setup();
    renderComProviders(<MembrosPage />);

    await user.click(await screen.findByText("Ana Paula"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Só super admin pode editar membros.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });

  it("o e-mail no modal não é editável -- é a identidade da pessoa", async () => {
    const user = userEvent.setup();
    renderComProviders(<MembrosPage />);

    await user.click(await screen.findByText("Ana Paula"));

    expect(await screen.findByLabelText("E-mail")).toBeDisabled();
  });

});
