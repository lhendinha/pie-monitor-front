const API_URL = import.meta.env.VITE_API_URL;

const KEYS = {
  access: "pje-monitor-access-token",
  refresh: "pje-monitor-refresh-token",
  expira: "pje-monitor-expira-em",
  username: "pje-monitor-username",
  papel: "pje-monitor-papel",
  grupoId: "pje-monitor-grupo-id",
};

/** Decodifica o payload de um JWT sem verificar assinatura -- só pra UI (a
 * autorização de verdade sempre acontece no backend). */
function decodificarPayload(jwt) {
  try {
    const [, payloadB64] = jwt.split(".");
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function getAccessToken() {
  return localStorage.getItem(KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(KEYS.refresh);
}

export function getUsername() {
  return localStorage.getItem(KEYS.username);
}

export function getPapel() {
  return localStorage.getItem(KEYS.papel);
}

export function getGrupoId() {
  return localStorage.getItem(KEYS.grupoId);
}

export function ehSuperAdmin() {
  return getPapel() === "super_admin";
}

/** true se o papel atual atende ao mínimo exigido (mesma hierarquia do backend). */
export function papelAtende(papelMinimo) {
  const ordem = ["user", "manager", "admin", "super_admin"];
  const atual = getPapel();
  if (!ordem.includes(atual)) return false;
  return ordem.indexOf(atual) >= ordem.indexOf(papelMinimo);
}

function salvarTokens({ access_token, refresh_token, expira_em, username }) {
  const payload = decodificarPayload(access_token);
  localStorage.setItem(KEYS.access, access_token);
  localStorage.setItem(KEYS.refresh, refresh_token);
  localStorage.setItem(KEYS.expira, String(expira_em));
  localStorage.setItem(KEYS.username, username);
  localStorage.setItem(KEYS.papel, payload.papel || "");
  localStorage.setItem(KEYS.grupoId, payload.grupo_id || "");
}

export function limparTokens() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function estaAutenticado() {
  return Boolean(getAccessToken() && getRefreshToken());
}

/** POST /login -- credenciais -> salva o par de tokens. */
export async function login(username, password) {
  const resp = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.erro || "Não foi possível entrar.");
  }
  salvarTokens(dados);
  return dados;
}

/** POST /refresh -- troca o refresh token (rotacionado) por um access token novo. */
export async function renovarToken() {
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
export async function logout() {
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

/** POST /convites/{token}/aceitar -- público, cria a conta e já loga (auto-login). */
export async function aceitarConvite(token, username, password) {
  const resp = await fetch(`${API_URL}/convites/${token}/aceitar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(dados.erro || "Não foi possível aceitar o convite.");
  }
  salvarTokens(dados);
  return dados;
}
