/** Documento e o envio de arquivo. */

/** Um documento: um arquivo guardado no armazenamento, ou um link.
 *
 * ⚠️ **`titulo` e `nome_arquivo` são coisas diferentes**, e a distinção é o
 * que impede uma surpresa silenciosa:
 *
 * - `titulo` é como o documento se chama NA LISTA. Nasce com o nome do
 *   arquivo, é digitado quando é link, e se edita nos dois casos.
 * - `nome_arquivo` é o nome com que o arquivo BAIXA (`Content-Disposition`),
 *   e **não** se edita. Fossem o mesmo campo, renomear o título mudaria o
 *   nome do arquivo baixado meses depois, sem ninguém ter pedido.
 *
 * ⚠️ `tipo` é STRING, não união fechada: o backend guarda assim de propósito,
 * pra o "documento padrão" entrar depois sem migração. Quem exibe usa
 * `rotuloDoTipo`, que devolve o valor cru pro que não conhece -- some com o
 * registro seria pior que rotular feio.
 */
export interface Documento {
  subgrupo_id: string;
  documento_id: string;
  grupo_id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  /** Só em `arquivo`. */
  nome_arquivo?: string | null;
  chave_s3?: string | null;
  /** MEDIDO pelo armazenamento, não declarado pelo navegador. */
  tamanho_bytes?: number | null;
  /** DECLARADO pelo navegador -- ninguém abriu o arquivo pra conferir.
   * Nenhuma decisão da tela se apoia nele. */
  content_type?: string | null;
  /** Só em `link`. */
  url?: string | null;
  processo_numero?: string | null;
  atendimento_id?: string | null;
  cliente_ids?: string[] | null;
  /** Derivado, NA MESMA ORDEM de `cliente_ids` -- o servidor resolve pra
   * página pedida. Cai pro próprio id quando o cliente não é encontrado. */
  cliente_nomes?: string[] | null;
  responsavel_id?: string | null;
  /** Derivado: o apelido de quem responde. Mesma razão de
   * `Tarefa.responsavel_nome` -- a lista de pessoas do grupo só chega pra
   * `manager` pra cima, e sem isto quem é `user` veria e-mail cru. */
  responsavel_nome?: string | null;
  criado_por?: string | null;
  criado_em?: string;
  atualizado_em?: string | null;
  sequencia?: number;
}

/** O que `POST /subgrupos/{sg}/documentos/upload` devolve: a permissão de
 * gravar UM objeto, e onde.
 *
 * `campos` vai inteiro no formulário, sem ser lido nem reordenado -- ele é a
 * política assinada, e mexer em qualquer par derruba a assinatura. */
export interface EnvioPreparado {
  chave: string;
  url: string;
  campos: Record<string, string>;
}

export interface FiltrosDeDocumentos {
  busca?: string;
  processoNumero?: string;
  atendimentoId?: string;
  clienteId?: string;
  /** Filtro de ESCOLHA, não de permissão: estreita o que a pessoa já vê.
   * Subgrupo fora do alcance devolve lista vazia, nunca o conteúdo dele. */
  subgrupoId?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

/** O corpo de `POST`/`PATCH /documentos`.
 *
 * ⚠️ Chamava-se `DadosDeDocumento` enquanto vivia dentro de
 * `services/api/documentos.ts`: ali o arquivo já dizia de que documento se
 * falava. Num barrel compartilhado, "dados de documento" não diz nada. */
export interface CamposDeDocumento {
  tipo: string;
  titulo: string;
  descricao?: string;
  /** Só no tipo `arquivo`, e vem do `prepararEnvio` -- nunca montada aqui. */
  chave?: string;
  nome_arquivo?: string;
  /** Só no tipo `link`. */
  url?: string;
  processo_numero?: string | null;
  atendimento_id?: string | null;
  cliente_ids?: string[];
  responsavel_id?: string | null;
}

/** Clientes já escolhidos ao abrir o modal de documento, com os nomes: a
 * etiqueta mostra nome, e a busca do campo não roda sozinha pra
 * descobri-lo. */
export interface ClientesIniciaisDoDocumento {
  ids: string[];
  nomes: Map<string, string>;
}
