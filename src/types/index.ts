export type Papel = "user" | "manager" | "admin" | "super_admin";

export interface Subgrupo {
  subgrupo_id: string;
  grupo_id?: string;
  nome: string;
  criado_em?: string;
}

export interface Processo {
  subgrupo_id: string;
  numero_processo: string;
  apelido: string;
  criado_por?: string;
  ultima_verificacao?: string | null;
}

export interface Membro {
  username: string;
  papel?: Papel;
  criado_em?: string;
}

export interface Comunicacao {
  numero_processo: string;
  comunicacao_id: number | string;
  data_disponibilizacao?: string;
  tipo_comunicacao?: string;
  nome_orgao?: string;
  texto?: string;
  link?: string;
}

export interface HistoricoItem {
  numero_processo: string;
  enviado_em: string;
  assunto?: string;
  mensagem?: string;
  tipo_comunicacao?: string;
  nome_orgao?: string;
  subgrupos_notificados?: string[];
  destinatarios?: string[];
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
  expira_em: number;
  username: string;
}

export interface JwtPayload {
  username?: string;
  grupo_id?: string | null;
  papel?: Papel;
  type?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/** Query string opcional + corpo opcional, usados nas chamadas de api.ts */
export interface OpcoesRequisicao {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  query?: Record<string, string | undefined>;
}
