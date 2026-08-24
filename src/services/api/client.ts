import { getAccessToken, renovarToken } from "../auth";
import type { OpcoesRequisicao } from "../../types";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

if (!API_URL) {
   
  console.warn(
    "VITE_API_URL não configurada. Defina no .env (veja .env.example) ou nas variáveis de ambiente do Vercel."
  );
}

export class ApiError extends Error {
  status: number;
  /** Corpo inteiro da resposta de erro.
   *
   * Existe porque alguns erros carregam mais que a mensagem: o `401` do
   * login manda `tentativas_restantes` e `bloqueio_minutos` nas últimas
   * tentativas, e o `429` manda `retry_after_segundos`. Guardar só o texto
   * jogava fora exatamente o que a tela precisa pra avisar antes do
   * bloqueio.
   */
  corpo: Record<string, unknown>;

  constructor(message: string, status: number, corpo: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.corpo = corpo;
  }
}

/** Valor de um parâmetro de query. Array vira **parâmetro repetido**
 * (`?fase_id=a&fase_id=b`), que é o formato que o FastAPI lê como lista --
 * usado pelos filtros de seleção múltipla. */
export type ValorQuery = string | string[] | undefined;

function montarQuery(query?: Record<string, ValorQuery>): string {
  if (!query || Object.keys(query).length === 0) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    // `append`, não `set`: `set` sobrescreveria e só o último valor da
    // lista chegaria ao servidor -- filtro múltiplo virando filtro de um.
    if (Array.isArray(v)) v.filter(Boolean).forEach((item) => params.append(k, item));
    else params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

interface RespostaCrua {
  ok: boolean;
  status: number;
  dados: any;
}

// Achado 9: sem isso, 2+ requisições que tomam 401 ao mesmo tempo disparavam
// cada uma seu próprio POST /refresh -- como o refresh token é rotacionado no
// backend, a 2ª chamada usava um token já invalidado pela 1ª, falhava, e
// `renovarToken()` apagava os tokens recém-salvos pela 1ª (deslogando no meio
// do uso). Uma promise compartilhada garante que 401s concorrentes disparem
// só 1 renovação, todos aguardando o mesmo resultado.
let renovacaoEmAndamento: Promise<boolean> | null = null;

export function renovarTokenCompartilhado(): Promise<boolean> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = renovarToken().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
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
    const renovou = await renovarTokenCompartilhado();
    if (renovou) {
      ({ ok, status, dados } = await requisicaoCrua(path, opcoes));
    }
  }

  if (!ok) {
    // 🔴 NÃO limpa aqui. Quem sabe distinguir "o servidor recusou o refresh
    // token" de "a rede caiu no meio" é o `renovarToken`, e ele já faz a
    // coisa certa: limpa no primeiro caso, não limpa no segundo.
    //
    // Este `limparTokens()` incondicional desfazia essa distinção -- um
    // segundo de instabilidade no POST /refresh custava a sessão inteira,
    // com o refresh token ainda válido no servidor.
    throw new ApiError(dados.detail || "Erro desconhecido", status, dados);
  }
  return dados as T;
}
