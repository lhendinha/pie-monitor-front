export type Papel = "user" | "manager" | "admin" | "super_admin";

export interface Subgrupo {
  subgrupo_id: string;
  grupo_id?: string;
  nome: string;
  criado_em?: string;
  /** E-mail de quem criou. É o que libera um `manager` a excluir o próprio
   * subgrupo -- ver `podeExcluirSubgrupo`. Vem vazio nos subgrupos criados
   * antes do campo existir, e ausente nas rotas que devolvem subgrupo
   * enxuto. */
  criado_por?: string;
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
  /** Se excluir deixaria QUEM ESTÁ PERGUNTANDO sem subgrupo nenhum no grupo
   * -- o quinto impedimento, e o único que não é contagem.
   *
   * Vem do servidor porque a tela não tem como deduzir: ela só conhece a
   * listagem de subgrupos, que é escopada por participação pra
   * `user`/`manager` mas é o grupo INTEIRO pra `admin`+. O mesmo número
   * significa coisas diferentes conforme o papel. */
  ficaria_sem_subgrupo: boolean;
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

export const TAMANHOS_PAGINA = [10, 20, 30, 50, 100] as const;

/** Abas de topo do App.tsx. "grupo" agrupa Subgrupos/Membros/Convidar/
 * Fases/Situações como sub-navegação (ver GrupoPage + SubAbaId). */


/** Sub-abas dentro de GrupoPage. */
export type SubAbaId =
  | "subgrupos"
  | "membros"
  | "convidar"
  | "fases"
  | "situacoes"
  | "configuracoes";

/** `GET /grupos/configuracoes` -- configurações do próprio grupo.
 *
 * Os limites vêm do servidor junto do valor: a tela valida antes de mandar,
 * e repetir os números aqui seria dois lugares pra manter em acordo. */
export interface ConfiguracoesDoGrupo {
  nome: string;
  dias_para_arquivar: number;
  dias_para_arquivar_minimo: number;
  dias_para_arquivar_maximo: number;
  dias_para_arquivar_padrao: number;
  nome_tamanho_maximo: number;
}

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
  /** O destino do que já foi concluído há tempo demais pra ocupar espaço no
   * quadro. Tarefa arquivada CONTINUA CONCLUÍDA -- é concluída guardada,
   * não um terceiro estado.
   *
   * Coluna fixa: não se renomeia, não se move, não se exclui e não vira
   * conclusão. O servidor recusa as quatro coisas. */
  e_arquivado: boolean;
}

export interface Tarefa {
  subgrupo_id: string;
  tarefa_id: string;
  titulo: string;
  data: string;
  coluna_id: string;
  prioridade: string;
  responsavel_id?: string | null;
  /** O vínculo da tarefa. Um OU o outro, nunca os dois -- é assim que o
   * backend grava, e o campo da tela reflete isso sendo um só. */
  processo_numero?: string | null;
  atendimento_id?: string | null;
}

/** Um registro da linha do tempo do atendimento.
 *
 * Append-only: não se edita nem se apaga. É registro de atendimento a
 * cliente, e reescrever o passado é justamente o que ele não pode
 * permitir -- o servidor não tem rota pra isso. */
export interface RegistroDeAtendimento {
  autor_id: string;
  registrado_em: string;
  texto: string;
}

// Os status possíveis saíram pra `constants/atendimento.ts` -- é valor de
// runtime, e aqui é lugar de tipo.

export interface Atendimento {
  subgrupo_id: string;
  atendimento_id: string;
  assunto: string;
  status: string;
  criado_em: string;
  criado_por?: string;
  sequencia?: number;
  cliente_ids: string[];
  processo_numero?: string | null;
  /** A listagem devolve o atendimento inteiro, registros inclusos -- é de
   * onde sai a prévia do último registro em cada linha. */
  registros: RegistroDeAtendimento[];
}

/** O que o campo de vínculo da tarefa precisa. Continua separado de
 * `Atendimento` porque aquele campo só usa quatro chaves, e exigir a lista
 * de registros ali obrigaria a inventá-la em todo teste que monta um. */
/** O mínimo pra rotular uma tarefa vinculada: quem é o atendimento e qual o
 * assunto. Deliberadamente menor que `AtendimentoResumido` -- devolver o
 * atendimento inteiro criaria uma segunda forma competindo com a da tela de
 * detalhe, e "duas formas na mesma chave" é o defeito que este projeto
 * passou uma auditoria inteira fechando. */
export interface ResumoDeAtendimento {
  subgrupo_id: string;
  atendimento_id: string;
  assunto: string;
}

export interface AtendimentoResumido {
  subgrupo_id: string;
  atendimento_id: string;
  assunto: string;
  status: string;
}

/** Um item vinculável achado na busca.
 *
 * `rotulo` e `detalhe` são só pra tela; o que sai daqui pro servidor é o
 * `id`, no campo que o `tipo` indica.
 */
export interface Vinculo {
  tipo: "processo" | "atendimento";
  id: string;
  rotulo: string;
  detalhe?: string;
}

/** Os vínculos de uma tarefa: até um de cada tipo.
 *
 * Duas fatias, e não uma lista, porque é o formato do backend --
 * `processo_numero` e `atendimento_id` são campos independentes, um valor
 * cada. Escolher um processo novo TROCA o anterior; não empilha.
 */
export interface VinculosDaTarefa {
  processo: Vinculo | null;
  atendimento: Vinculo | null;
}

/** Qualquer item ordenável: uma opção de Fase/Situação ou uma coluna do
 * quadro. `calcularOrdemAposMover` só precisa da `ordem`, e pedir a
 * entidade inteira prenderia o helper a uma delas. */
export interface ComOrdem {
  ordem: number;
}

/** Qualquer coisa que carregue ids de cliente -- processo ou atendimento.
 * Mesmo motivo do `ComOrdem`: o helper que resolve nomes só precisa dos
 * ids. */
export interface ComClientes {
  cliente_ids?: string[];
}


/** Um aviso in-app. Uma linha POR DESTINATÁRIO: "lida" é individual, e o
 * mesmo fato vira N linhas quando vai pro subgrupo. */
export interface Notificacao {
  usuario_id: string;
  notificacao_id: string;
  tipo: string;
  criado_em: string;
  lida: boolean;
  /** Quem fez a ação. Vazio no lembrete de prazo -- ali não houve pessoa,
   * foi o robô, e a frase é escrita sem "Fulano". */
  autor: string;
  titulo: string;
  /** Complemento: a coluna de destino, o status novo, o motivo do
   * lembrete. */
  detalhe: string;
  subgrupo_id: string;
  /** Pra onde o clique leva, em duas partes em vez de um campo por tipo de
   * recurso -- o mesmo `tipo` pode apontar pra coisas diferentes (o
   * `lembrete` vale pra tarefa E pra processo). */
  alvo_tipo: string;
  alvo_id: string;
}

/** O que o canal de tempo real manda. `tipo` distingue os formatos --
 * hoje só existe "notificacao", mas o campo evita que um formato novo
 * quebre quem já escuta. */
export interface MensagemDoCanal {
  tipo: string;
  notificacao?: Notificacao;
}
