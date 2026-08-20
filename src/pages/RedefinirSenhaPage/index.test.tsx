import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  redefinirSenha: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, redefinirSenha: mocks.redefinirSenha };
});

import { ApiError } from "../../services/api/client";
import RedefinirSenhaPage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
});

async function preencherEEnviar(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nova senha"), "senha-forte-123");
  await user.type(screen.getByLabelText("Confirmar senha"), "senha-forte-123");
  await user.click(screen.getByRole("button", { name: "Redefinir senha" }));
}

describe("RedefinirSenhaPage", () => {
  it("em sucesso, mostra a confirmação", async () => {
    mocks.redefinirSenha.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<RedefinirSenhaPage token="token-valido" />);

    await preencherEEnviar(user);

    expect(await screen.findByText("Senha redefinida! Redirecionando…")).toBeInTheDocument();
  });

  it("achado 19: link expirado/já usado (410) mostra aviso de link inválido, não destaca a senha", async () => {
    mocks.redefinirSenha.mockRejectedValue(new ApiError("Link de recuperação inválido ou expirado", 410));
    const user = userEvent.setup();
    renderComProviders(<RedefinirSenhaPage token="token-expirado" />);

    await preencherEEnviar(user);

    expect(
      await screen.findByText(/link de recuperação é inválido ou já foi usado/i)
    ).toBeInTheDocument();
    // o formulário some -- não faz sentido deixar o usuário tentar de novo
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("erro que não é 410 mantém o formulário e não mostra o aviso de link inválido", async () => {
    mocks.redefinirSenha.mockRejectedValue(new ApiError("Senha muito curta", 400));
    const user = userEvent.setup();
    renderComProviders(<RedefinirSenhaPage token="token-outro-erro" />);

    await preencherEEnviar(user);

    await waitFor(() => expect(mocks.redefinirSenha).toHaveBeenCalled());
    expect(screen.queryByText(/link de recuperação é inválido/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
  });

  it("senhas diferentes bloqueiam o envio antes de chamar a API", async () => {
    const user = userEvent.setup();
    renderComProviders(<RedefinirSenhaPage token="token-x" />);

    await user.type(screen.getByLabelText("Nova senha"), "senha-forte-123");
    await user.type(screen.getByLabelText("Confirmar senha"), "outra-senha-456");

    expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeDisabled();
    expect(mocks.redefinirSenha).not.toHaveBeenCalled();
  });
});
