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

/** Recorte gerencial, transversal às categorias (Cível, Trabalhista). */
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
