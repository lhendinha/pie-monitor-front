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
