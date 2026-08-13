import { getAccessToken, renovarToken, limparTokens } from "../auth";
import type { OpcoesRequisicao } from "../../types";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_API_URL não configurada. Defina no .env (veja .env.example) ou nas variáveis de ambiente do Vercel."
  );
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function montarQuery(query?: Record<string, string | undefined>): string {
  if (!query || Object.keys(query).length === 0) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

interface RespostaCrua {
  ok: boolean;
  status: number;
  dados: any;
}

async function requisicaoCrua(path: string, opcoes: OpcoesRequisicao = {}): Promise<RespostaCrua> {
  const { method = "GET", body, query } = opcoes;
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
 * tenta renovar uma vez via refresh token antes de desistir. Usada por
 * todos os módulos de domínio dentro de services/api/.
 */
export async function chamar<T = any>(path: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
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
  return dados as T;
}

/** Pra super_admin: injeta grupo_id na query (GET) ou no corpo (POST/DELETE). */
export function comGrupoAlvo(opcoes: OpcoesRequisicao, grupoIdAlvo?: string): OpcoesRequisicao {
  if (!grupoIdAlvo) return opcoes;
  if ((opcoes.method || "GET") === "GET") {
    return { ...opcoes, query: { ...(opcoes.query || {}), grupo_id: grupoIdAlvo } };
  }
  return { ...opcoes, body: { ...(opcoes.body || {}), grupo_id: grupoIdAlvo } };
}
