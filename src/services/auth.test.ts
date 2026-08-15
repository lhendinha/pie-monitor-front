import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JwtPayload, TokensResponse } from "../types";
import {
  ehSuperAdmin,
  estaAutenticado,
  getAccessToken,
  getApelido,
  getEmail,
  getGrupoId,
  getPapel,
  getRefreshToken,
  limparTokens,
  login,
  logout,
  papelAtende,
  renovarToken,
} from "./auth";

function base64url(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Monta um JWT "de mentira" (assinatura não é verificada por decodificarPayload). */
function tokenFake(payload: JwtPayload): string {
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.assinatura-qualquer`;
}

function tokensResponse(overrides: Partial<TokensResponse> = {}, payload: JwtPayload = {}): TokensResponse {
  return {
    access_token: tokenFake({ email: "fulano@example.com", papel: "user", grupo_id: "g1", ...payload }),
    refresh_token: "refresh-abc",
    expira_em: 1999999999,
    email: "fulano@example.com",
    apelido: null,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("estaAutenticado", () => {
  it("false quando não há token nenhum", () => {
    expect(estaAutenticado()).toBe(false);
  });

  it("true quando access e refresh token estão presentes", () => {
    localStorage.setItem("pje-monitor-access-token", "x");
    localStorage.setItem("pje-monitor-refresh-token", "y");
    expect(estaAutenticado()).toBe(true);
  });

  it("false se só um dos dois tokens estiver presente", () => {
    localStorage.setItem("pje-monitor-access-token", "x");
    expect(estaAutenticado()).toBe(false);
  });
});

describe("papelAtende / ehSuperAdmin", () => {
  it("sem papel nenhum salvo, não atende nada", () => {
    expect(papelAtende("user")).toBe(false);
  });

  it("admin atende user, manager e admin, mas não super_admin", () => {
    localStorage.setItem("pje-monitor-papel", "admin");
    expect(papelAtende("user")).toBe(true);
    expect(papelAtende("manager")).toBe(true);
    expect(papelAtende("admin")).toBe(true);
    expect(papelAtende("super_admin")).toBe(false);
  });

  it("user só atende user", () => {
    localStorage.setItem("pje-monitor-papel", "user");
    expect(papelAtende("user")).toBe(true);
    expect(papelAtende("manager")).toBe(false);
  });

  it("ehSuperAdmin só é true pro papel super_admin", () => {
    localStorage.setItem("pje-monitor-papel", "admin");
    expect(ehSuperAdmin()).toBe(false);
    localStorage.setItem("pje-monitor-papel", "super_admin");
    expect(ehSuperAdmin()).toBe(true);
  });
});

describe("login", () => {
  it("em sucesso, salva os tokens e os dados decodificados do JWT", async () => {
    const resposta = tokensResponse({ apelido: "Fulano" }, { papel: "manager", grupo_id: "g99" });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => resposta,
    } as Response);

    const resultado = await login("fulano@example.com", "senha-123");

    expect(resultado).toEqual(resposta);
    expect(getAccessToken()).toBe(resposta.access_token);
    expect(getRefreshToken()).toBe("refresh-abc");
    expect(getEmail()).toBe("fulano@example.com");
    expect(getApelido()).toBe("Fulano");
    expect(getPapel()).toBe("manager");
    expect(getGrupoId()).toBe("g99");
  });

  it("sem apelido na resposta, remove qualquer apelido salvo anteriormente", async () => {
    localStorage.setItem("pje-monitor-apelido", "Apelido Antigo");
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => tokensResponse({ apelido: null }),
    } as Response);

    await login("fulano@example.com", "senha-123");
    expect(getApelido()).toBeNull();
  });

  it("em erro, lança com a mensagem do backend (dados.detail) e não salva nada", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Credenciais inválidas" }),
    } as Response);

    await expect(login("fulano@example.com", "senha-errada")).rejects.toThrow("Credenciais inválidas");
    expect(getAccessToken()).toBeNull();
  });

  it("em erro sem detail, usa mensagem genérica em português", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response);
    await expect(login("x@example.com", "y")).rejects.toThrow("Não foi possível entrar.");
  });
});

describe("renovarToken", () => {
  it("sem refresh token salvo, nem tenta chamar a API", async () => {
    const resultado = await renovarToken();
    expect(resultado).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("em sucesso, salva o novo par de tokens (rotacionado) e devolve true", async () => {
    localStorage.setItem("pje-monitor-refresh-token", "refresh-antigo");
    const novaResposta = tokensResponse({ refresh_token: "refresh-novo" });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => novaResposta } as Response);

    expect(await renovarToken()).toBe(true);
    expect(getRefreshToken()).toBe("refresh-novo");
    expect(getAccessToken()).toBe(novaResposta.access_token);
  });

  it("em falha (refresh token inválido/expirado), limpa os tokens e devolve false", async () => {
    localStorage.setItem("pje-monitor-refresh-token", "refresh-expirado");
    localStorage.setItem("pje-monitor-access-token", "algum-token");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response);

    expect(await renovarToken()).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("em erro de rede, devolve false sem lançar (best-effort)", async () => {
    localStorage.setItem("pje-monitor-refresh-token", "refresh-x");
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(renovarToken()).resolves.toBe(false);
  });
});

describe("logout", () => {
  it("limpa os tokens localmente mesmo se a chamada ao servidor falhar", async () => {
    localStorage.setItem("pje-monitor-access-token", "x");
    localStorage.setItem("pje-monitor-refresh-token", "y");
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await logout();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("sem refresh token salvo, nem tenta chamar a API", async () => {
    await logout();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("com refresh token salvo, notifica o servidor pra revogar", async () => {
    localStorage.setItem("pje-monitor-refresh-token", "y");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    await logout();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("limparTokens", () => {
  it("remove todas as chaves conhecidas do localStorage", () => {
    localStorage.setItem("pje-monitor-access-token", "a");
    localStorage.setItem("pje-monitor-refresh-token", "b");
    localStorage.setItem("pje-monitor-email", "c");
    localStorage.setItem("pje-monitor-apelido", "d");
    localStorage.setItem("pje-monitor-papel", "e");
    localStorage.setItem("pje-monitor-grupo-id", "f");

    limparTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getEmail()).toBeNull();
    expect(getApelido()).toBeNull();
    expect(getPapel()).toBeNull();
    expect(getGrupoId()).toBeNull();
  });
});
