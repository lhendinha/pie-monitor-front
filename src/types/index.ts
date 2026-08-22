export type Papel = "user" | "manager" | "admin" | "super_admin";

export interface Subgrupo {
  subgrupo_id: string;
  grupo_id?: string;
  nome: string;
  criado_em?: string;
}

export interface Grupo {
  grupo_id: string;
  nome: string;
}

export interface Processo {
  subgrupo_id: string;
  numero_processo: string;
  apelido: string;
  criado_por?: string;
  grupo_id?: string;
  sequencia?: number;
  ultima_verificacao?: string | null;
  cliente_ids?: string[];
  objeto_assunto?: string | null;
  proxima_providencia?: string | null;
  data_verificar?: string | null;
  prazo_final?: string | null;
  observacoes?: string | null;
  fase_id?: string | null;
  situacao_id?: string | null;
  /** Resumo da comunicação mais recente, gravado pela lambda `check` junto
   * com `ultima_verificacao`. A coluna "Última movimentação" da tabela junta
   * os três: o tipo em cima, e embaixo a data em que o TRIBUNAL publicou
   * (`ultima_mov_data`) mais quando o ROBÔ olhou (`ultima_verificacao`).
   * Vem `null` em processo que ainda não teve nenhuma comunicação. */
  ultima_mov_tipo?: string | null;
  ultima_mov_data?: string | null;
}

export interface Cliente {
  grupo_id: string;
  cliente_id: string;
  nome: string;
  criado_por?: string;
  criado_em?: string;
  cpf_cnpj?: string | null;
  /** Quantos processos do grupo referenciam este cliente. Campo DERIVADO,
   * calculado pela API (22/08/2026) -- não está gravado no cliente. Conta
   * a linha de processo, então o mesmo número em dois subgrupos conta
   * duas vezes. */
  processos?: number;
  telefone?: string | null;
  email?: string | null;
}

export type TipoOpcaoProcesso = "fase" | "situacao";

export interface OpcaoProcesso {
  tipo: TipoOpcaoProcesso;
  opcao_id: string;
  rotulo: string;
  ordem: number;
  ativo: boolean;
  criado_em?: string;
}

/** Filtros estruturados do painel "Filtros" em ProcessosPage -- separado
 * de `FiltrosProcessos` (services/api/processos.ts), que já inclui `busca`
 * e usa nomes de campo iguais aos da query string. */
/** Filtros estruturados da tela de Processos.
 *
 * Fase e situação são LISTAS: a tela usa seleção múltipla (como o artifact)
 * e o backend aceita o parâmetro repetido -- "aguardando contestação OU
 * audiência" é pergunta de todo dia num escritório. Cliente segue único,
 * também como no artifact. */
export interface FiltrosProcessos {
  clienteId: string;
  faseIds: string[];
  situacaoIds: string[];
  dataVerificarAte: string;
  prazoFinalAte: string;
}

export interface Membro {
  email: string;
  apelido?: string;
  papel?: Papel;
  criado_em?: string;
  adicionado_em?: string;
  subgrupos?: string[];
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
  /** Referência pra comunicação em GET /processos/{numero}/detalhes que
   * gerou essa notificação -- não carrega o texto, só o ID pra casar. */
  comunicacao_id?: number;
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
  expira_em: number;
  email: string;
  apelido?: string | null;
}

export interface JwtPayload {
  email?: string;
  grupo_id?: string | null;
  papel?: Papel;
  type?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/** Query string opcional + corpo opcional, usados nas chamadas de api.ts */
export interface OpcoesRequisicao {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  /** Array vira parâmetro repetido (`?fase_id=a&fase_id=b`), que é como o
   * FastAPI lê lista. Ver `montarQuery` em services/api/client.ts. */
  query?: Record<string, string | string[] | undefined>;
}

/** Campos comuns do envelope de paginação real (backend: shared/paginacao.py). */
export interface EnvelopePaginacao {
  pagina: number;
  tamanho_pagina: number;
  total: number;
  total_paginas: number;
}

export const TAMANHOS_PAGINA = [10, 20, 30, 50, 100] as const;
export type TamanhoPagina = (typeof TAMANHOS_PAGINA)[number];

/** Abas de topo do App.tsx. "grupo" agrupa Subgrupos/Membros/Convidar/
 * Fases/Situações como sub-navegação (ver GrupoPage + SubAbaId). */


/** Sub-abas dentro de GrupoPage. */
export type SubAbaId = "subgrupos" | "membros" | "convidar" | "fases" | "situacoes";

export interface SubAbaConfig {
  id: SubAbaId;
  label: string;
  minimo: Papel;
}

/** Tarefa do Kanban. Aqui só os campos que o detalhe do processo usa -- o
 * quadro completo entra na etapa dele. */
export interface Tarefa {
  subgrupo_id: string;
  tarefa_id: string;
  titulo: string;
  data: string;
  coluna_id: string;
  prioridade: string;
  responsavel_id?: string | null;
  processo_numero?: string | null;
}
