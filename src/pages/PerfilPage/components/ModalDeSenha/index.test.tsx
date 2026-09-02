import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  alterarMinhaSenha: vi.fn(async () => ({})),
}));

vi.mock("../../../../services", () => mocks);

import ModalDeSenha from "./index";

/** O primeiro modal ligado à guarda de descarte -- a implementação de
 * referência para os outros sete.
 *
 * A projeção aqui é a mais simples que existe: três campos crus, sem
 * normalização (senha não se apara nem se acentua) e sem semeadura, porque
 * nada vem do servidor.
 */
function montar() {
  const onFechar = vi.fn();
  renderComProviders(<ModalDeSenha onFechar={onFechar} />);
  return onFechar;
}

const atual = () => screen.getByLabelText(/Senha atual/);
const perguntou = () => screen.queryByText("Sair sem salvar?") !== null;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guarda de descarte", () => {
  it("🔴 com a senha começada, o Escape PERGUNTA", async () => {
    const usuario = userEvent.setup();
    const onFechar = montar();

    await usuario.type(atual(), "a");
    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(true);
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("INTACTO, o Escape fecha direto", async () => {
    /* O par negativo, e o caso mais comum: abrir sem querer e sair. */
    const usuario = userEvent.setup();
    const onFechar = montar();

    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("🔴 digitar e APAGAR volta a fechar direto", async () => {
    /* O par que mata "sujo é ter interagido". Quem começou a digitar por
       engano e apagou não pode ser interrogado ao sair. */
    const usuario = userEvent.setup();
    const onFechar = montar();

    await usuario.type(atual(), "a");
    await usuario.type(atual(), "{Backspace}");
    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('"Continuar editando" preserva o que foi digitado', async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.type(atual(), "segredo");
    await usuario.keyboard("{Escape}");

    await usuario.click(screen.getByRole("button", { name: "Continuar editando" }));

    expect(atual()).toHaveValue("segredo");
  });
});
