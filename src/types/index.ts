export type Papel = "user" | "manager" | "admin" | "super_admin";

export interface Subgrupo {
  subgrupo_id: string;
  grupo_id?: string;
  nome: string;
  criado_em?: string;
  /** Contagens DERIVADAS, calculadas por `GET /subgrupos` só pra página
   * pedida -- a linha mostra "N membros · N colunas". Opcionais porque
   * outras rotas devolvem subgrupo sem elas (o seletor dos formulários,
   * por exemplo, que só precisa de id e nome). */
  membros?: number;
  colunas?: number;
}

/** O que existe dentro de um subgrupo -- o que impede excluí-lo.
 * `GET /subgrupos/{id}/conteudo`. */
export interface ConteudoDoSubgrupo {
  membros: number;
  processos: number;
  tarefas: number;
  atendimentos: number;
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
  /** `movimentacao` (novidade vinda do PJe) ou `lembrete` (aviso de prazo).
   * Registro antigo não tem o campo, e a leitura trata ausente como
   * `movimentacao` -- senão todo o histórico anterior sumiria do filtro. */
  tipo_envio?: "movimentacao" | "lembrete";
  /** O e-mail não saiu. Fica registrado pra dar o que investigar quando
   * alguém diz "não fui avisado" -- antes isso só existia no log. */
  falhou?: boolean;
  erro?: string;
  /** Lembrete de tarefa não tem processo: `numero_processo` guarda
   * `TAREFA#{id}` porque é chave de partição e o DynamoDB recusa string
   * vazia. Quem lê distingue por aqui, nunca decompondo aquele campo. */
  tarefa_id?: string;
  subgrupo_id?: string;
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
/** Contagens da Área de trabalho (`GET /resumo`). */
export interface ResumoDaAreaDeTrabalho {
  a_verificar_ate_hoje: number;
  prazo_final_em_7_dias: number;
  tarefas_atrasadas: number;
  tarefas_sem_responsavel: number;
  envios_com_falha: number;
  minhas_concluidas: number;
  minhas_atrasadas: number;
  minhas_a_concluir: number;
  processos_total: number;
  atendimentos_em_andamento: number;
  movimentacoes_7_dias: number;
}

/** Uma coluna do quadro Kanban de um subgrupo. */
export interface ColunaDoQuadro {
  subgrupo_id: string;
  coluna_id: string;
  nome: string;
  ordem: number;
  /** A coluna que marca conclusão. Só uma por quadro -- marcar outra
   * desmarca esta, no servidor. */
  e_conclusao: boolean;
}

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
