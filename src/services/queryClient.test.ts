import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ estaAutenticado: vi.fn(), dispararAutenticacaoInvalida: vi.fn() }));
vi.mock("./auth", () => ({ estaAutenticado: mocks.estaAutenticado }));
vi.mock("./authBridge", () => ({ dispararAutenticacaoInvalida: mocks.dispararAutenticacaoInvalida }));

import { ApiError } from "./api";
import { queryClient } from "./queryClient";

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});

describe("401 só desloga quando a sessão morreu de verdade", () => {
  /**
   * 🔴 `chamar` tenta renovar antes de desistir e, se a renovação falhar,
   * propaga o 401 ORIGINAL. O handler global deslogava por causa do status,
   * mesmo quando a falha tinha sido de REDE e o refresh token seguia válido
   * no servidor -- um segundo de instabilidade custava a sessão inteira.
   *
   * Tirar o `limparTokens()` de dentro do `chamar` não resolveu: o caminho
   * que desloga é o handler.
   *
   * `renovarToken` já distingue -- limpa os tokens quando o SERVIDOR recusa
   * o refresh, não limpa quando a rede caiu. Então "ainda tenho tokens"
   * significa falha transitória.
   */
  async function dispararErro(erro: unknown) {
    await queryClient
      .fetchQuery({ queryKey: ["x"], queryFn: () => Promise.reject(erro), retry: false })
      .catch(() => {});
  }

  it("401 com os tokens ainda presentes NÃO desloga", async () => {
    mocks.estaAutenticado.mockReturnValue(true);
    await dispararErro(new ApiError("Não autenticado", 401));
    expect(mocks.dispararAutenticacaoInvalida).not.toHaveBeenCalled();
  });

  it("401 sem tokens desloga -- o servidor recusou o refresh", async () => {
    mocks.estaAutenticado.mockReturnValue(false);
    await dispararErro(new ApiError("Não autenticado", 401));
    expect(mocks.dispararAutenticacaoInvalida).toHaveBeenCalled();
  });

  it("outros status nunca deslogam", async () => {
    mocks.estaAutenticado.mockReturnValue(false);
    await dispararErro(new ApiError("Conflito", 409));
    expect(mocks.dispararAutenticacaoInvalida).not.toHaveBeenCalled();
  });
});
