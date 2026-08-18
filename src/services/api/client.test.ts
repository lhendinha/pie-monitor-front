import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  renovarToken: vi.fn(),
  limparTokens: vi.fn(),
}));

vi.mock("../auth", () => mocks);

import { ApiError, chamar } from "./client";

function respostaFetch(status: number, corpo: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(corpo),
  } as Response;
}

describe("ApiError", () => {
  it("carrega status junto da mensagem", () => {
    const err = new ApiError("deu ruim", 403);
    expect(err.message).toBe("deu ruim");
    expect(err.status).toBe(403);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("chamar", () => {
  beforeEach(() => {
    mocks.getAccessToken.mockReturnValue("token-valido");
    mocks.renovarToken.mockReset();
    mocks.limparTokens.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve os dados quando a resposta é ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respostaFetch(200, { processos: [] }));
    const resultado = await chamar("/processos");
    expect(resultado).toEqual({ processos: [] });
  });

  it("manda o Authorization Bearer com o access token atual", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respostaFetch(200, {}));
    await chamar("/processos");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer token-valido");
  });

  it("em 401, tenta renovar o token uma vez e refaz a chamada se renovou", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(respostaFetch(401, { detail: "Autenticação inválida" }))
      .mockResolvedValueOnce(respostaFetch(200, { ok: true }));
    mocks.renovarToken.mockResolvedValueOnce(true);

    const resultado = await chamar("/processos");

    expect(mocks.renovarToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({ ok: true });
    expect(mocks.limparTokens).not.toHaveBeenCalled();
  });

  it("em 401 sem conseguir renovar, lança ApiError e limpa os tokens -- não refaz a chamada", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respostaFetch(401, { detail: "Autenticação inválida" }));
    mocks.renovarToken.mockResolvedValueOnce(false);

    await expect(chamar("/processos")).rejects.toMatchObject({
      status: 401,
      message: "Autenticação inválida",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.limparTokens).toHaveBeenCalledTimes(1);
  });

  it("em 401 mesmo depois de renovar e tentar de novo, limpa os tokens", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(respostaFetch(401, { detail: "x" }))
      .mockResolvedValueOnce(respostaFetch(401, { detail: "x" }));
    mocks.renovarToken.mockResolvedValueOnce(true);

    await expect(chamar("/processos")).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mocks.limparTokens).toHaveBeenCalledTimes(1);
  });

  it("em erro que não é 401 (ex: 403), não tenta renovar e não limpa tokens", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respostaFetch(403, { detail: "Ação exige papel admin ou superior" }));

    await expect(chamar("/convites")).rejects.toMatchObject({
      status: 403,
      message: "Ação exige papel admin ou superior",
    });
    expect(mocks.renovarToken).not.toHaveBeenCalled();
    expect(mocks.limparTokens).not.toHaveBeenCalled();
  });

  it("sem detail no corpo do erro, usa mensagem genérica", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respostaFetch(500, {}));
    await expect(chamar("/processos")).rejects.toMatchObject({ message: "Erro desconhecido" });
  });

  it("monta a query string a partir de opcoes.query, ignorando valores vazios", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respostaFetch(200, {}));
    await chamar("/processos", { query: { pagina: "2", busca: "" } });
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("?pagina=2");
    expect(url).not.toContain("busca");
  });
});
