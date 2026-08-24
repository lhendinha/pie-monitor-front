import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessaoProvider, useSessaoContexto } from "../../../contexts/SessaoContext";
import { renderComProviders } from "../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  getApelido: vi.fn(),
  getEmail: vi.fn(),
  getPapel: vi.fn(),
}));

vi.mock("../../../services", async () => {
  const real = await vi.importActual<Record<string, unknown>>("../../../services");
  return { ...real, ...mocks };
});

import MenuUsuario from "./index";

function montar(onSair = vi.fn()) {
  // O nome vem do contexto de sessão agora, não de `getApelido()` no render
  // -- o React Compiler congelava a leitura direta e a topbar ficava com o
  // nome antigo a sessão inteira depois de editar o perfil.
  renderComProviders(
    <MemoryRouter>
      <SessaoProvider>
        <MenuUsuario onSair={onSair} />
      </SessaoProvider>
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

describe("apelido reativo", () => {
  it("🔴 o nome novo aparece sem recarregar a página", async () => {
    /* `getApelido()` era chamado no corpo do render. Com o React Compiler
     * ligado (vite.config.ts), uma leitura sem dependência é memoizada por
     * todo o mount -- e o AppShell não desmonta ao navegar. A pessoa editava
     * o apelido, via "Perfil atualizado", e a topbar logo acima continuava
     * com o nome antigo A SESSÃO INTEIRA, até um F5. É exatamente o que o
     * docstring de `salvarApelido` diz existir pra evitar. */
    function Cenario() {
      const { trocarApelido } = useSessaoContexto();
      return (
        <>
          <MenuUsuario onSair={vi.fn()} />
          <button type="button" onClick={() => trocarApelido("Nome Novo")}>
            trocar
          </button>
        </>
      );
    }

    mocks.getApelido.mockReturnValue("Nome Antigo");
    const user = userEvent.setup();
    renderComProviders(
      <MemoryRouter>
        <SessaoProvider>
          <Cenario />
        </SessaoProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Nome Antigo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "trocar" }));

    expect(await screen.findByText("Nome Novo")).toBeInTheDocument();
    expect(screen.queryByText("Nome Antigo")).not.toBeInTheDocument();
  });
});
