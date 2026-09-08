/** O catálogo do Financeiro: contas, categorias e centros de custo.
 *
 * ⚠️ Os nomes vêm como a API os devolve, VERBATIM -- o front não renomeia
 * campo de resposta. Quem escreve parâmetro de chamada em camelCase é o
 * índice de tipos, e quem traduz para a API é o serviço.
 *
 * ⚠️ Dinheiro é sempre `centavos` INTEIROS, nunca `number` com decimal: é a
 * mesma régua da API, e o JavaScript não tem tipo decimal. Formatar para
 * "R$ 1.234,56" é trabalho de `utils`, na borda da tela.
 */

import type { OpcoesDePaginacao } from "./api";

/** Onde o dinheiro entra e de onde sai. `GET /financeiro/catalogo`. */
export interface ContaFinanceira {
  conta_id: string;
  nome: string;
  /** `corrente` ou `outros`. */
  tipo: string;
  /** A data a partir da qual o saldo desta conta é acompanhado. */
  inicio: string;
  saldo_inicial_centavos: number;
  /** O saldo ATUAL, mantido pela API a cada baixa. Não é recalculado na
   * leitura, então é o número que a tela mostra. */
  saldo_centavos: number;
  ativa: boolean;
  banco?: string;
  agencia?: string;
  numero?: string;
}

/** Para onde o dinheiro vai. Pode ser filha de uma agrupadora. */
export interface CategoriaFinanceira {
  categoria_id: string;
  nome: string;
  /** `entrada` ou `saida` -- ver `NATUREZA_ENTRADA` em `constants`. */
  natureza: string;
  cor: string;
  /** Vazio quando é de primeiro nível. A agrupadora não aceita lançamento:
   * ela só soma as filhas. */
  agrupador_id: string;
  ativa: boolean;
}

/** Recorte gerencial, transversal às categorias: **projeto ou filial**
 * (Administrativo, Escritório Recife, Contrato XPTO).
 *
 * 🔴 **Não é o departamento.** O departamento é o SUBGRUPO, e ele existe no
 * sistema inteiro -- processos, pessoas, permissão. O centro de custo é
 * opcional e a maioria dos escritórios nunca cria nenhum; os exemplos daqui
 * eram "Cível" e "Trabalhista", que são nomes de subgrupo e ensinavam a
 * duplicar a lista de equipes à mão. */
export interface CentroDeCusto {
  centro_id: string;
  nome: string;
  ativo: boolean;
}

/** `GET /financeiro/catalogo` devolve as três listas de uma vez -- é uma
 * Query só no servidor, e a tela precisa das três para montar qualquer
 * formulário de lançamento. */
export interface CatalogoFinanceiro {
  contas: ContaFinanceira[];
  categorias: CategoriaFinanceira[];
  centros_de_custo: CentroDeCusto[];
  /** A conta escolhida em Grupo > Configurações. Vazia enquanto ninguém
   * escolheu -- e a primeira conta criada vira a padrão sozinha. */
  conta_padrao_id: string;
  /** A paleta que os dois repositórios compartilham, para a categoria nova
   * não nascer com uma cor que some no fundo. */
  cores_disponiveis: string[];
}

/** Um departamento e quanto do lançamento é dele.
 *
 * 🔴 A soma das parcelas é IGUAL ao valor do lançamento -- a API recusa com
 * 400 se não bater. É essa invariante que faz somar por departamento dar o
 * mesmo que somar os lançamentos.
 *
 * ⚠️ Com UMA parcela, `valor_centavos` pode ser omitido no envio: ali ele só
 * pode ser o valor do lançamento. Na resposta ele vem sempre preenchido. */
export interface ParcelaDoRateio {
  subgrupo_id: string;
  valor_centavos: number;
}

/** A mesma parcela do lado de quem ESCREVE -- no formulário e no corpo da
 * requisição.
 *
 * 🔴 `valor_centavos` é opcional aqui, e obrigatório na leitura acima: com
 * UMA linha o valor só pode ser o do lançamento, e o schema da API a aceita
 * sem ele de propósito. Mandar o número de novo faria a tela dizer a mesma
 * coisa duas vezes, com um 400 esperando o dia em que as duas discordassem.
 * Com duas linhas ou mais, todas trazem o seu.
 *
 * ⚠️ Tipo com nome, e não objeto solto dentro de `DadosDoLancamento`: o
 * formulário segura exatamente esta forma antes de enviá-la. */
export interface ParcelaParaEnviar {
  subgrupo_id: string;
  valor_centavos?: number;
}

/** Uma linha do dinheiro: honorário, entrada, saída ou transferência.
 *
 * ⚠️ **Só os campos que a tela usa.** A resposta traz também `grupo_id`,
 * `sequencia`, `vencimento_ordem` e `aberto_ordem`, que são de dentro do
 * servidor -- listá-los aqui convidaria alguém a desenhar com eles.
 *
 * ⚠️ **`data_efetivacao` some da resposta quando vazia** (é chave esparsa no
 * banco). Quem pergunta se já entrou lê `situacao`, nunca a ausência do
 * campo. */
/** Até onde uma edição ou uma exclusão alcança numa série.
 *
 * 🔴 Vive aqui, e não na chamada de API, porque a TELA também escolhe: o
 * diálogo de exclusão guarda a resposta antes de chamar. Repetir a união em
 * dois lugares deixaria os dois discordarem no dia em que a API ganhasse um
 * terceiro escopo.
 *
 * ⚠️ Sem série (ou sendo o último irmão), o servidor IGNORA o escopo -- por
 * isso a tela só oferece a escolha quando há `recorrencia_id`. */
export type EscopoDaSerie = "este" | "futuros";

export interface Lancamento {
  lancamento_id: string;
  /** `honorario`, `entrada`, `saida` ou `transferencia`. */
  tipo: string;
  descricao: string;
  valor_centavos: number;
  data_vencimento: string;
  /** Preenchida = já entrou ou saiu. Ausente = ainda aberto. */
  data_efetivacao?: string;
  /** Derivada na leitura: `aberto`, `efetivado` ou `atrasado`. Nunca
   * gravada -- um lançamento "atrasado" vira "efetivado" sozinho no dia em
   * que alguém o baixa, sem ninguém reescrever nada. */
  situacao: string;
  /** `entrada` ou `saida`. Vazia na transferência: o dinheiro só muda de
   * conta, e não tem lado. */
  natureza: string;
  conta_id: string;
  conta_origem_id?: string;
  conta_destino_id?: string;
  categoria_id: string;
  centro_id: string;
  /** A classificação por departamento. Transferência vem com lista vazia. */
  rateio: ParcelaDoRateio[];
  /** 🔴 Só vem quando a lista está filtrada por departamento: é o PEDAÇO que
   * cabe àquele, e é o número que a tela mostra ali. Sem filtro não existe
   * "pedaço", existe o lançamento -- e é a ausência do campo que diz para
   * não escrever `(de R$ 10.000)` ao lado. */
  valor_no_departamento_centavos?: number;
  cliente_id: string;
  /** Quem pagou ou recebeu, quando não é um cliente do Argos. Um ou outro,
   * nunca os dois. */
  contraparte: string;
  /** O endereço do VÍNCULO -- é ele que acha o processo. Não confundir com o
   * `rateio`, que é a classificação. */
  subgrupo_id: string;
  numero_processo: string;
  atendimento_id: string;
  responsavel: string;
  documento_numero: string;
  /** `"2/3"` num honorário parcelado. */
  parcela: string;
  /** Presente = o lançamento tem irmãos numa série (parcelas, repetição).
   *
   * 🔴 É o que faz a pergunta do Google Agenda existir: sem série não há
   * "este e os próximos" a oferecer, e oferecer assim mesmo pediria uma
   * escolha que não muda nada. Esparso na API -- ausente quando não há. */
  recorrencia_id?: string;
  /** Presente = já entrou numa fatura que o cliente recebeu.
   *
   * 🔴 Excluir e desfazer a baixa dão **409** aqui (`LancamentoEmFatura`):
   * mudariam o total de um documento já emitido. A tela esconde as duas
   * ações e diz por quê -- ver `LancamentoDetalhePage`. */
  fatura_id?: string;
  criado_por: string;
  criado_em: string;
}

/** Os três cards do topo da lista.
 *
 * 🔴 Vêm da RESPOSTA, e não somados da página: eles são do período inteiro,
 * e mudar de página não pode mudar o número.
 *
 * ⚠️ Com filtro por departamento, as somas são do PEDAÇO -- senão a lista
 * mostraria R$ 4.000 e o card R$ 10.000, os dois na mesma tela. As
 * CONTAGENS continuam de lançamentos: meio lançamento não existe. */
export interface TotaisDeLancamentos {
  a_receber_centavos: number;
  a_receber_quantidade: number;
  a_pagar_centavos: number;
  a_pagar_quantidade: number;
  atrasado_centavos: number;
  atrasado_quantidade: number;
}

/** Os campos que a tela de detalhe do lançamento edita, do jeito que o
 * formulário os segura.
 *
 * 🔴 Vive aqui, e não no `types.ts` da pasta do formulário, porque
 * `camposAlteradosDoLancamento` (`utils/lancamentos.ts`) o consome: tipo que
 * atravessa a fronteira da página vale fora dela. Mesma régua do
 * `CamposEditaveisDoAtendimento`.
 *
 * ⚠️ Nomes em camelCase e `valorCentavos` podendo ser `null`: é o estado da
 * TELA, não o corpo da requisição -- aquele é `CamposDoLancamento`, em
 * `types/requisicoes`. */
export interface CamposEditaveisDoLancamento {
  descricao: string;
  dataVencimento: string;
  valorCentavos: number | null;
  contraparte: string;
  documento: string;
  categoriaId: string;
  centroId: string;
  contaId: string;
  responsavel: string;
  rateio: ParcelaParaEnviar[];
}

/** Os filtros da lista, todos opcionais e todos combináveis.
 *
 * 🔴 `subgrupo_id` é o DEPARTAMENTO, e a pergunta que ele faz é "tem parcela
 * para X" -- não é o subgrupo do vínculo. Com ele, cada linha ganha
 * `valor_no_departamento_centavos` e os totais somam o PEDAÇO.
 *
 * ⚠️ Sem `de`/`ate` a API lê "todos os períodos", que é escolha de quem
 * clica. O padrão da tela é "Este mês", e quem manda as datas é ela. */
export type FiltrosDeLancamentos = OpcoesDePaginacao & {
  de?: string;
  ate?: string;
  tipo?: string;
  /** `entrada` ou `saida` -- a NATUREZA, derivada do tipo.
   *
   * 🔴 Não é o mesmo que `tipo`: "a receber" são honorário e entrada, os
   * dois de natureza `entrada`. Filtrar por `tipo=entrada` derruba os
   * honorários -- é o que o card dos totais fazia. */
  natureza?: string;
  situacao?: string;
  conta_id?: string;
  categoria_id?: string;
  centro_id?: string;
  subgrupo_id?: string;
  cliente_id?: string;
  busca?: string;
  /** O card da Área de trabalho: o que vence em N dias, atrasados
   * inclusive. Troca a leitura pelo índice dos abertos. */
  vencendo?: number;
};

/** Um cliente com dinheiro a faturar. `GET /faturas/a-faturar`.
 *
 * 🔴 `honorarios_centavos` e `despesas_centavos` vêm SEPARADOS porque a
 * fatura os trata diferente: o honorário é linha de cobrança, e a despesa
 * vira um RECEBÍVEL de reembolso no valor dela -- somar as duas como se
 * fossem a mesma coisa faria o total do documento não bater. */
export interface ClienteAFaturar {
  cliente_id: string;
  cliente_nome: string;
  honorarios_centavos: number;
  despesas_centavos: number;
  total_centavos: number;
  /** Os lançamentos que entram, para o modal desmarcar um a um. */
  lancamentos: Lancamento[];
}

/** Uma fatura emitida. `GET /faturas` e `GET /faturas/{id}`.
 *
 * ⚠️ Ela NÃO traz o nome do cliente -- só o id. Quem desenha resolve pelo
 * catálogo, como a lista de lançamentos faz com categoria e conta. */
export interface Fatura {
  fatura_id: string;
  /** `2026-0007` -- ano e sequência do escritório, com quatro dígitos. */
  numero: string;
  cliente_id: string;
  /** Os honorários que ela cobra. */
  lancamento_ids: string[];
  /** As despesas que ela reembolsa -- elas NÃO são linha de cobrança. */
  despesa_ids: string[];
  /** O recebível de reembolso que a emissão criou, quando havia despesa. */
  reembolso_id: string;
  valor_total_centavos: number;
  data_vencimento: string;
  /** `aberta`, `paga` ou `cancelada` -- ver as constantes. */
  situacao: string;
  /** Preenchida só na paga. */
  pago_em: string;
  criado_por: string;
  criado_em: string;
}

/** O detalhe traz os lançamentos junto, para a tabela do documento. */
export interface FaturaComLancamentos extends Fatura {
  lancamentos: Lancamento[];
}

/** Uma linha do fluxo de caixa: uma categoria, mês a mês. */
export interface LinhaDoFluxo {
  categoria_id: string;
  nome: string;
  /** `entrada` ou `saida` -- é o que separa os dois agrupadores da tabela. */
  natureza: string;
  cor: string;
  /** Centavos por mês, na chave `aaaa-mm`. */
  por_mes: Record<string, number>;
  total_centavos: number;
}

/** `GET /financeiro/fluxo-de-caixa`.
 *
 * 🔴 **Realizado é por EFETIVAÇÃO; previsto é por VENCIMENTO.** Os dois vêm
 * separados porque a tela precisa dos dois para não mentir: o previsto que
 * não aconteceu está nas colunas e não está no saldo.
 *
 * ⚠️ `saldo_disponivel` diz se dá para desenhar a faixa de saldo: sem conta
 * cadastrada não há de onde partir, e uma linha de saldo zerada seria uma
 * afirmação falsa. */
export interface FluxoDeCaixa {
  meses: string[];
  saldo_disponivel: boolean;
  linhas: LinhaDoFluxo[];
  entradas_por_mes: Record<string, number>;
  saidas_por_mes: Record<string, number>;
  entradas_realizadas_por_mes: Record<string, number>;
  saidas_realizadas_por_mes: Record<string, number>;
  entradas_previstas_por_mes: Record<string, number>;
  saidas_previstas_por_mes: Record<string, number>;
  transferencias_por_mes: Record<string, number>;
  aberturas_de_conta_por_mes: Record<string, number>;
  saldo_anterior_por_mes: Record<string, number>;
  saldo_do_periodo_por_mes: Record<string, number>;
  saldo_final_por_mes: Record<string, number>;
}

/** Os filtros do fluxo de caixa. As pontas são MESES (`aaaa-mm`). */
export interface OpcoesDoFluxo {
  de?: string;
  ate?: string;
  centro_id?: string;
  conta_id?: string;
  subgrupo_id?: string;
}
