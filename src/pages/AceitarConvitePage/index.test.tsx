import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  aceitarConvite: vi.fn(),
  verificarConvite: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return {
    ...real,
    aceitarConvite: mocks.aceitarConvite,
    verificarConvite: mocks.verificarConvite,
  };
});

import { ApiError } from "../../services/api/client";
import AceitarConvitePage from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  // A página confere o link ao abrir; o padrão é válido, e os testes que
  // medem o link inválido dizem o contrário explicitamente.
  mocks.verificarConvite.mockResolvedValue({ valido: true });
});

describe("AceitarConvitePage", () => {
  it('o campo do nome se chama "Nome completo", e não "Apelido"', async () => {
    /* 🔴 Só o RÓTULO muda -- atrás continua o campo `apelido`, sem migração.
       O nome novo vale onde a PESSOA lê, mesma régua de `pje-monitor` vs
       Argos.

       ⚠️ A negativa é REGEX, e não a string exata que o teste do perfil usa:
       aqui o rótulo antigo era "Apelido (opcional)", e `queryByLabelText`
       casa por IGUALDADE -- `queryByLabelText("Apelido")` passaria com o
       rótulo velho ainda na tela, e o teste não provaria nada.

       ⚠️ E ela vem DEPOIS do `findByLabelText`: a página mostra esqueleto enquanto
       confere o link, e antes disso "Apelido" está ausente à toa. */
    renderComProviders(<AceitarConvitePage token="token-valido" onEntrar={vi.fn()} />);

    expect(await screen.findByLabelText(/^Nome completo/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Apelido/)).not.toBeInTheDocument();
  });

  it("em sucesso, mostra a confirmação", async () => {
    mocks.aceitarConvite.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="token-valido" onEntrar={vi.fn()} />);

    await user.type(await screen.findByLabelText(/^Senha/), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: "Criar conta e entrar" }));

    expect(await screen.findByText("Conta criada! Entrando…")).toBeInTheDocument();
  });

  it("achado 19: link expirado/já usado (410) mostra aviso de link inválido, não destaca a senha", async () => {
    mocks.aceitarConvite.mockRejectedValue(new ApiError("Convite inválido ou expirado", 410));
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="token-expirado" onEntrar={vi.fn()} />);

    await user.type(await screen.findByLabelText(/^Senha/), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: "Criar conta e entrar" }));

    expect(
      await screen.findByText(/link de convite é inválido ou já foi usado/i)
    ).toBeInTheDocument();
    // o formulário some -- não faz sentido deixar o usuário tentar de novo
    expect(screen.queryByLabelText(/^Senha/)).not.toBeInTheDocument();
  });

  it("erro que não é 410 mantém o formulário e não mostra o aviso de link inválido", async () => {
    mocks.aceitarConvite.mockRejectedValue(new ApiError("Você já tem uma conta cadastrada", 409));
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="token-ja-usado-por-conta" onEntrar={vi.fn()} />);

    await user.type(await screen.findByLabelText(/^Senha/), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: "Criar conta e entrar" }));

    await waitFor(() => expect(mocks.aceitarConvite).toHaveBeenCalled());
    expect(screen.queryByText(/link de convite é inválido/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/)).toBeInTheDocument();
  });

  it("link expirado é dito ao ABRIR, sem pedir senha antes", async () => {
    /* Antes, a pessoa preenchia apelido e senha, clicava, esperava o
     * round-trip e SÓ ENTÃO lia que o convite tinha expirado -- uma recusa
     * já conhecida quando a página carregou. */
    mocks.verificarConvite.mockResolvedValue({ valido: false });
    renderComProviders(<AceitarConvitePage token="expirado" onEntrar={vi.fn()} />);

    expect(await screen.findByText("Convite expirado")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Senha/)).not.toBeInTheDocument();
    expect(mocks.aceitarConvite).not.toHaveBeenCalled();
  });

  it("FALHA na conferência não vira 'convite expirado'", async () => {
    /* Erro de rede não é recusa. Sem esta distinção, uma queda momentânea
     * mandaria a pessoa pedir um convite novo que não precisa. O formulário
     * abre e quem decide é o envio, como antes. */
    mocks.verificarConvite.mockRejectedValue(new Error("rede caiu"));
    renderComProviders(<AceitarConvitePage token="qualquer" onEntrar={vi.fn()} />);

    expect(await screen.findByLabelText(/^Senha/)).toBeInTheDocument();
  });

  it("avisa a rota quando a conta é criada, em vez de recarregar a página", async () => {
    // `window.location.href = "/"` recarregava o SPA inteiro depois de 1,5s
    // parado: tela branca e boot frio, com a sessão já pronta.
    mocks.aceitarConvite.mockResolvedValue({});
    const onEntrar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<AceitarConvitePage token="valido" onEntrar={onEntrar} />);

    await user.type(await screen.findByLabelText(/^Senha/), "senha-forte-123");
    await user.click(screen.getByRole("button", { name: /Criar conta/i }));

    await waitFor(() => expect(onEntrar).toHaveBeenCalled());
  });
});
