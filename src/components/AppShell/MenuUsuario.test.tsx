import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  getApelido: vi.fn(),
  getEmail: vi.fn(),
  getPapel: vi.fn(),
}));

vi.mock("../../services", async () => {
  const real = await vi.importActual<Record<string, unknown>>("../../services");
  return { ...real, ...mocks };
});

import MenuUsuario from "./MenuUsuario";

function montar(onSair = vi.fn()) {
  renderComProviders(
    <MemoryRouter>
      <MenuUsuario onSair={onSair} />
    </MemoryRouter>,
  );
  return onSair;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getApelido.mockReturnValue("Ana Paula");
  mocks.getEmail.mockReturnValue("ana@x.com");
  mocks.getPapel.mockReturnValue("admin");
});

describe("MenuUsuario", () => {
  it("mostra o nome e as iniciais no chip", () => {
    montar();
    expect(screen.getByText("Ana Paula")).toBeInTheDocument();
    expect(screen.getByText("AP")).toBeInTheDocument();
  });

  it("o chip é type=button -- dentro de form, sem isso viraria submit", () => {
    montar();
    const chip = screen.getByText("Ana Paula").closest("button")!;
    expect(chip).toHaveAttribute("type", "button");
  });

  it("abre o menu com as duas opções", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByText("Ana Paula").closest("button")!);

    expect(await screen.findByText("Meu perfil")).toBeInTheDocument();
    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("'Sair' chama o encerramento de sessão", async () => {
    // Precisa passar pelo `sair` da sessão, que faz POST /logout antes de
    // limpar o local -- só limpar o storage deixaria o refresh token válido
    // no servidor.
    const user = userEvent.setup();
    const onSair = montar();

    await user.click(screen.getByText("Ana Paula").closest("button")!);
    await user.click(await screen.findByText("Sair"));

    expect(onSair).toHaveBeenCalled();
  });

  it("cai no e-mail quando não há apelido", () => {
    mocks.getApelido.mockReturnValue(null);
    montar();
    expect(screen.getByText("ana@x.com")).toBeInTheDocument();
  });
});
