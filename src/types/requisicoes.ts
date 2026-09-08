/** O que as chamadas de API MANDAM -- o espelho de `respostas.ts`.
 *
 * Vive em `types` e não ao lado de cada função de `services/api` porque não
 * é tipo de uma página: quem chama a rota pode ser qualquer tela, e o
 * formato do corpo é contrato com o servidor, não detalhe de quem
 * apresenta.
 */
import type { ParcelaParaEnviar } from "./financeiro";


/** A edição de membro manda todos os campos juntos: a rota substitui o
 * conjunto, não faz merge.
 *
 * ⚠️ `type`, e não `interface`: isto vai direto como `body`, que é
 * `Record<string, unknown>`. Interface não é atribuível a um Record -- o TS
 * não lhe dá index signature implícita; um type alias tem. */
export type DadosDoMembro = {
  apelido: string;
  grupo_id: string;
  papel: string;
  subgrupos: string[];
  /** A inscrição da OAB da pessoa, editável por `admin`+ (Fase 1b).
   *
   * 🔴 **`undefined` = não mexer**, como no perfil. Mandar `""` APAGA a
   * inscrição -- é o único jeito de removê-la, e a diferença entre as duas
   * coisas é o que o tipo guarda. */
  numero_oab?: string;
  uf_oab?: string;
  importacao_automatica?: boolean;
  subgrupos_destino?: string[];
};

/** PATCH parcial da coluna do quadro: campo omitido não é tocado. */
export type CamposDaColuna = {
  nome?: string;
  ordem?: number;
};

export type DadosDaConta = {
  nome: string;
  tipo: string;
  inicio: string;
  saldo_inicial_centavos: number;
  banco?: string;
  agencia?: string;
  numero?: string;
};

export type DadosDaCategoria = {
  nome: string;
  natureza: string;
  cor: string;
  /** Vazio para categoria de primeiro nível. */
  agrupador_id?: string;
};

/** O que o `PATCH` da categoria aceita.
 *
 * 🔴 Sem `natureza`, e é a régua inteira do editar no catálogo: muda o que
 * NÃO reescreve história. Trocar a natureza inverteria o lado do caixa de
 * tudo lançado ali, e a API responde 422. */
export type CamposDaCategoria = {
  nome?: string;
  cor?: string;
  /** Vazio TIRA do agrupador -- é uma edição legítima, não "não enviei". */
  agrupador_id?: string;
};

/** O que o `PATCH` da conta aceita.
 *
 * 🔴 Sem `tipo`, `inicio` e `saldo_inicial_centavos`: o tipo muda quais
 * campos são obrigatórios num item que já existe, e os outros dois são
 * write-once porque o saldo atual é mantido a partir deles. */
export type CamposDaConta = {
  nome?: string;
  banco?: string;
  agencia?: string;
  numero?: string;
};

/** Centro de custo é só o nome. */
export type DadosDoCentro = {
  nome: string;
};

/** O corpo comum dos quatro POST de lançamento.
 *
 * 🔴 `rateio` é OBRIGATÓRIO (menos na transferência, que tem corpo próprio):
 * é a classificação por departamento, e sem ela o lançamento ficaria fora de
 * todo relatório por departamento. Com uma parcela só, o `valor_centavos`
 * dela pode ser omitido -- ali ele só pode ser o valor do lançamento, e
 * mandar o número duas vezes é um 400 esperando o dia em que as duas cópias
 * discordassem.
 *
 * ⚠️ `cliente_id` OU `contraparte`, nunca os dois: quem pagou é um cliente do
 * Argos ou é texto livre. */
export type DadosDoLancamento = {
  descricao: string;
  valor_centavos: number;
  data_vencimento: string;
  conta_id: string;
  categoria_id: string;
  rateio: ParcelaParaEnviar[];
  centro_id?: string;
  cliente_id?: string;
  contraparte?: string;
  subgrupo_id?: string;
  numero_processo?: string;
  atendimento_id?: string;
  responsavel?: string;
  documento_numero?: string;
  /** Preenchida = nasce já efetivado, e o saldo da conta anda no mesmo ato. */
  data_efetivacao?: string;
  /** A chave que a TELA gera ao abrir o formulário: o duplo clique devolve os
   * MESMOS ids em vez de criar de novo -- e é ela que impede o saldo de
   * andar duas vezes num lançamento que nasce efetivado. */
  chave_de_criacao?: string;
};

/** A transferência não tem categoria, cliente, natureza nem rateio: o
 * dinheiro só muda de conta e não entra no fluxo de caixa. */
export type DadosDaTransferencia = {
  descricao: string;
  valor_centavos: number;
  data_vencimento: string;
  conta_origem_id: string;
  conta_destino_id: string;
  responsavel?: string;
  documento_numero?: string;
  chave_de_criacao?: string;
};

/** O PATCH manda SÓ o que mudou -- a mesma régua do processo e do
 * atendimento.
 *
 * 🔴 Mudar `valor_centavos` de um lançamento RATEADO exige o `rateio` novo
 * junto: redistribuir R$ 10.000 que viraram R$ 8.000 é decisão de quem
 * edita, e o servidor responde 400 em vez de escolher de quem tirar. Com uma
 * parcela só, ele se acerta sozinho. */
export type CamposDoLancamento = {
  descricao?: string;
  valor_centavos?: number;
  data_vencimento?: string;
  conta_id?: string;
  categoria_id?: string;
  centro_id?: string;
  rateio?: ParcelaParaEnviar[];
  cliente_id?: string;
  contraparte?: string;
  responsavel?: string;
  documento_numero?: string;
};
