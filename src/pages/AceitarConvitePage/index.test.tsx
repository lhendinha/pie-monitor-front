import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  aceitarConvite: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, aceitarConvite: mocks.aceitarConvite };
});

import { ApiError } from "../../services/api/client";
import AceitarConvitePage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AceitarConvitePage", () => {
  it("em sucesso, mostra a confirmação", async () => {
    mocks.aceitarConvite.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="token-valido" />);

    await user.type(screen.getByLabelText("Senha"), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Conta criada! Redirecionando…")).toBeInTheDocument();
  });

  it("achado 19: link expirado/já usado (410) mostra aviso de link inválido, não destaca a senha", async () => {
    mocks.aceitarConvite.mockRejectedValue(new ApiError("Convite inválido ou expirado", 410));
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="token-expirado" />);

    await user.type(screen.getByLabelText("Senha"), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(
      await screen.findByText(/link de convite é inválido ou já foi usado/i)
    ).toBeInTheDocument();
    // o formulário some -- não faz sentido deixar o usuário tentar de novo
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });

  it("erro que não é 410 mantém o formulário e não mostra o aviso de link inválido", async () => {
    mocks.aceitarConvite.mockRejectedValue(new ApiError("Você já tem uma conta cadastrada", 409));
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="token-ja-usado-por-conta" />);

    await user.type(screen.getByLabelText("Senha"), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(mocks.aceitarConvite).toHaveBeenCalled());
    expect(screen.queryByText(/link de convite é inválido/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });
});
