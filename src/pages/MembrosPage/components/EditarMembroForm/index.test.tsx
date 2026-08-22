import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../../../test/queryTestUtils";
import type { Grupo, Membro, Subgrupo } from "../../../../types";

const mocks = vi.hoisted(() => ({
  listarMembrosDoGrupo: vi.fn(),
  listarSubgruposDoGrupo: vi.fn(),
  atualizarMembro: vi.fn(),
  getGrupoId: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import EditarMembroForm from "./index";

const grupos: Grupo[] = [{ grupo_id: "g1", nome: "Grupo 1" }];
const subgrupos: Subgrupo[] = [{ subgrupo_id: "s1", nome: "Subgrupo 1", grupo_id: "g1" }];

function montarMembro(overrides: Partial<Membro> = {}): Membro {
  return { email: "fulano@x.com", apelido: "Fulano", papel: "user", subgrupos: ["s1"], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getGrupoId.mockReturnValue("g1");
  mocks.listarSubgruposDoGrupo.mockResolvedValue({ subgrupos });
});

describe("EditarMembroForm", () => {
  it("achado 20: sem nenhum subgrupo selecionado, mostra o texto de apoio e desabilita Salvar", async () => {
    const membro = montarMembro({ subgrupos: [] });
    mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    expect(await screen.findByText("Escolha ao menos um subgrupo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("com subgrupo selecionado, não mostra o texto de apoio e libera o Salvar", async () => {
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    expect(screen.queryByText("Escolha ao menos um subgrupo.")).not.toBeInTheDocument();
  });

  it("submete a atualização com os campos do formulário", async () => {
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    mocks.atualizarMembro.mockResolvedValue({});
    const onAtualizado = vi.fn();
    const onFechar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={onAtualizado} onFechar={onFechar} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarMembro).toHaveBeenCalledWith("fulano@x.com", {
        apelido: "Fulano",
        grupo_id: "g1",
        papel: "user",
        subgrupos: ["s1"],
      })
    );
    expect(onAtualizado).toHaveBeenCalled();
    expect(onFechar).toHaveBeenCalled();
  });
});
