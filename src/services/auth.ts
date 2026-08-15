import type { JwtPayload, Papel, TokensResponse } from "../types";
import { HIERARQUIA_PAPEIS } from "../constants";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const KEYS = {
  access: "pje-monitor-access-token",
  refresh: "pje-monitor-refresh-token",
  expira: "pje-monitor-expira-em",
  email: "pje-monitor-email",
  apelido: "pje-monitor-apelido",
  papel: "pje-monitor-papel",
  grupoId: "pje-monitor-grupo-id",
} as const;

/** Decodifica o payload de um JWT sem verificar assinatura -- só pra UI (a
 * autorização de verdade sempre acontece no backend). */
function decodificarPayload(jwt: string): JwtPayload {
  try {
    const [, payloadB64] = jwt.split(".");
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return {};
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.access);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refresh);
}

export function getEmail(): string | null {
  return localStorage.getItem(KEYS.email);
}

export function getApelido(): string | null {
  return localStorage.getItem(KEYS.apelido);
}

export function getPapel(): Papel | null {
  return localStorage.getItem(KEYS.papel) as Papel | null;
}

export function getGrupoId(): string | null {
  return localStorage.getItem(KEYS.grupoId);
}

export function ehSuperAdmin(): boolean {
  return getPapel() === "super_admin";
}

/** true se o papel atual atende ao mínimo exigido (mesma hierarquia do backend). */
export function papelAtende(papelMinimo: Papel): boolean {
  const atual = getPapel();
  if (!atual || !HIERARQUIA_PAPEIS.includes(atual)) return false;
  return HIERARQUIA_PAPEIS.indexOf(atual) >= HIERARQUIA_PAPEIS.indexOf(papelMinimo);
}

function salvarTokens({ access_token, refresh_token, expira_em, email, apelido }: TokensResponse): void {
  const payload = decodificarPayload(access_token);
  localStorage.setItem(KEYS.access, access_token);
  localStorage.setItem(KEYS.refresh, refresh_token);
  localStorage.setItem(KEYS.expira, String(expira_em));
  localStorage.setItem(KEYS.email, email);
  if (apelido) localStorage.setItem(KEYS.apelido, apelido);
  else localStorage.removeItem(KEYS.apelido);
  localStorage.setItem(KEYS.papel, payload.papel || "");
  localStorage.setItem(KEYS.grupoId, payload.grupo_id || "");
}

export function limparTokens(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function estaAutenticado(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}

/** POST /login -- credenciais -> salva o par de tokens. */
export async function login(email: string, password: string): Promise<TokensResponse> {
  const resp = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.detail || "Não foi possível entrar.");
  }
  salvarTokens(dados);
  return dados;
}

/** POST /refresh -- troca o refresh token (rotacionado) por um access token novo. */
export async function renovarToken(): Promise<boolean> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;

  try {
    const resp = await fetch(`${API_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!resp.ok) {
      limparTokens();
      return false;
    }
    const dados = await resp.json();
    salvarTokens(dados);
    return true;
  } catch {
    return false;
  }
}

/** POST /logout -- revoga o refresh token no servidor e limpa localmente. */
export async function logout(): Promise<void> {
  const refresh_token = getRefreshToken();
  limparTokens();
  if (refresh_token) {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
    } catch {
      // best-effort -- já limpamos localmente de qualquer forma
    }
  }
}

/** POST /convites/{token}/aceitar -- público, cria a conta e já loga (auto-login). Apelido é opcional. */
export async function aceitarConvite(
  token: string,
  password: string,
  apelido?: string
): Promise<TokensResponse> {
  const resp = await fetch(`${API_URL}/convites/${token}/aceitar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, apelido: apelido || undefined }),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.detail || "Não foi possível aceitar o convite.");
  }
  salvarTokens(dados);
  return dados;
}

/** POST /senha/esqueci -- público, sempre responde com sucesso genérico (não revela se o e-mail existe). */
export async function solicitarRecuperacaoSenha(email: string): Promise<{ mensagem: string }> {
  const resp = await fetch(`${API_URL}/senha/esqueci`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.detail || "Não foi possível processar o pedido.");
  }
  return dados;
}

/** POST /senha/redefinir -- público, troca a senha a partir do token recebido por e-mail. */
export async function redefinirSenha(token: string, password: string): Promise<{ mensagem: string }> {
  const resp = await fetch(`${API_URL}/senha/redefinir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.detail || "Não foi possível redefinir a senha.");
  }
  return dados;
}
