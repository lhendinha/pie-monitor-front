import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../../../test/queryTestUtils";
import type { Grupo, Membro, Subgrupo } from "../../../../types";

const mocks = vi.hoisted(() => ({
  listarTodosOsMembrosDoGrupo: vi.fn(),
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
  it("sem nenhum subgrupo, a instrução vira alerta e o Salvar trava", async () => {
    // Sem subgrupo, a pessoa fica com conta ativa e sem enxergar processo
    // nenhum -- o servidor recusa (`SubgruposObrigatorios`), e aqui o botão
    // nem chega a ficar clicável.
    const membro = montarMembro({ subgrupos: [] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha pelo menos um subgrupo.");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("com subgrupo, a mesma frase fica só como instrução", async () => {
    // O texto não muda porque a instrução não muda -- só a urgência dela.
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    expect(screen.getByText("Escolha pelo menos um subgrupo.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submete a atualização com os campos do formulário", async () => {
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
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
