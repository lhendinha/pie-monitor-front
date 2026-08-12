import { getAccessToken, renovarToken, limparTokens } from "./auth.js";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_API_URL não configurada. Defina no .env (veja .env.example) ou nas variáveis de ambiente do Vercel."
  );
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function requisicaoCrua(path, { method = "GET", body } = {}) {
  const resposta = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken() || ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : {};
  return { ok: resposta.ok, status: resposta.status, dados };
}

/**
 * Chama a API já autenticada. Se o access token estiver expirado (401),
 * tenta renovar uma vez via refresh token antes de desistir -- assim uma
 * sessão de até 30 dias (duração do refresh token) não pede login de novo
 * a cada 24h (duração do access token) sem o usuário perceber.
 */
async function chamar(path, opcoes = {}) {
  let { ok, status, dados } = await requisicaoCrua(path, opcoes);

  if (!ok && status === 401) {
    const renovou = await renovarToken();
    if (renovou) {
      ({ ok, status, dados } = await requisicaoCrua(path, opcoes));
    }
  }

  if (!ok) {
    if (status === 401) limparTokens();
    throw new ApiError(dados.erro || "Erro desconhecido", status);
  }
  return dados;
}

export function listarProcessos() {
  return chamar("/processos");
}

export function cadastrarProcesso(numeroProcesso, apelido) {
  return chamar("/processos", {
    method: "POST",
    body: { numero_processo: numeroProcesso, apelido },
  });
}

export function removerProcesso(numeroProcesso) {
  return chamar(`/processos/${numeroProcesso}`, { method: "DELETE" });
}

export function listarEmails() {
  return chamar("/emails");
}

export function cadastrarEmail(email) {
  return chamar("/emails", { method: "POST", body: { email } });
}

export function removerEmail(email) {
  return chamar(`/emails/${encodeURIComponent(email)}`, { method: "DELETE" });
}

export function listarHistorico(numeroProcesso) {
  const query = numeroProcesso ? `?numero_processo=${encodeURIComponent(numeroProcesso)}` : "";
  return chamar(`/historico${query}`);
}

export { ApiError };
