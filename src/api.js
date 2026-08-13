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

function montarQuery(query) {
  if (!query || Object.keys(query).length === 0) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function requisicaoCrua(path, { method = "GET", body, query } = {}) {
  const resposta = await fetch(`${API_URL}${path}${montarQuery(query)}`, {
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
 * tenta renovar uma vez via refresh token antes de desistir.
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

/** Pra super_admin: injeta grupo_id na query (GET) ou no corpo (POST/DELETE). */
function comGrupoAlvo(opcoes, grupoIdAlvo) {
  if (!grupoIdAlvo) return opcoes;
  if ((opcoes.method || "GET") === "GET") {
    return { ...opcoes, query: { ...(opcoes.query || {}), grupo_id: grupoIdAlvo } };
  }
  return { ...opcoes, body: { ...(opcoes.body || {}), grupo_id: grupoIdAlvo } };
}

/* ---------------------------------------------------------------------- */
/* Subgrupos                                                               */
/* ---------------------------------------------------------------------- */

export function listarSubgrupos(grupoIdAlvo) {
  return chamar("/subgrupos", comGrupoAlvo({}, grupoIdAlvo));
}

export function criarSubgrupo(nome, grupoIdAlvo) {
  return chamar("/subgrupos", comGrupoAlvo({ method: "POST", body: { nome } }, grupoIdAlvo));
}

export function removerSubgrupo(subgrupoId, grupoIdAlvo) {
  return chamar(`/subgrupos/${subgrupoId}`, comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo));
}

/* ---------------------------------------------------------------------- */
/* Membros                                                                  */
/* ---------------------------------------------------------------------- */

export function listarMembrosDoGrupo(grupoIdAlvo) {
  return chamar("/grupos/membros", comGrupoAlvo({}, grupoIdAlvo));
}

export function listarMembrosDoSubgrupo(subgrupoId, grupoIdAlvo) {
  return chamar(`/subgrupos/${subgrupoId}/membros`, comGrupoAlvo({}, grupoIdAlvo));
}

export function adicionarMembro(subgrupoId, username, grupoIdAlvo) {
  return chamar(
    `/subgrupos/${subgrupoId}/membros`,
    comGrupoAlvo({ method: "POST", body: { username } }, grupoIdAlvo)
  );
}

export function removerMembro(subgrupoId, username, grupoIdAlvo) {
  return chamar(
    `/subgrupos/${subgrupoId}/membros/${encodeURIComponent(username)}`,
    comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo)
  );
}

/* ---------------------------------------------------------------------- */
/* Processos                                                                */
/* ---------------------------------------------------------------------- */

export function listarProcessos(grupoIdAlvo) {
  return chamar("/processos", comGrupoAlvo({}, grupoIdAlvo));
}

export function criarProcesso(subgrupoId, numeroProcesso, apelido, grupoIdAlvo) {
  return chamar(
    `/subgrupos/${subgrupoId}/processos`,
    comGrupoAlvo({ method: "POST", body: { numero_processo: numeroProcesso, apelido } }, grupoIdAlvo)
  );
}

export function removerProcesso(subgrupoId, numeroProcesso, grupoIdAlvo) {
  return chamar(
    `/subgrupos/${subgrupoId}/processos/${numeroProcesso}`,
    comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo)
  );
}

export function detalhesProcesso(numeroProcesso, grupoIdAlvo) {
  return chamar(`/processos/${numeroProcesso}/detalhes`, comGrupoAlvo({}, grupoIdAlvo));
}

/* ---------------------------------------------------------------------- */
/* Convites                                                                 */
/* ---------------------------------------------------------------------- */

export function criarConvite(email, papelInicial, subgruposIniciais, grupoIdAlvo) {
  return chamar(
    "/convites",
    comGrupoAlvo(
      { method: "POST", body: { email, papel_inicial: papelInicial, subgrupos_iniciais: subgruposIniciais } },
      grupoIdAlvo
    )
  );
}

/* ---------------------------------------------------------------------- */
/* Histórico                                                                */
/* ---------------------------------------------------------------------- */

export function listarHistorico(numeroProcesso) {
  const query = numeroProcesso ? `?numero_processo=${encodeURIComponent(numeroProcesso)}` : "";
  return chamar(`/historico${query}`);
}

export { ApiError };
