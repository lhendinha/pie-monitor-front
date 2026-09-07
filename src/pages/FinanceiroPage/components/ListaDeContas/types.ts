import type { PaginationProps } from "../../../../components/Pagination/types";
import type { ContaFinanceira } from "../../../../types";

export interface ListaDeContasProps {
  /** Só os da PÁGINA atual: a lista vem de `GET /financeiro/contas`,
   * e não do catálogo inteiro. */
  contas: ContaFinanceira[];
  /** A consulta da página ainda não voltou -- a tabela dá lugar ao esqueleto. */
  carregando: boolean;
  /** Repassado inteiro ao `Pagination`, que decide sozinho se aparece
   * (some abaixo de 11 itens) e corrige a página que deixou de existir. */
  paginacao: PaginationProps;
  /** Para marcar qual delas é a padrão do grupo. Vazio enquanto ninguém
   * escolheu. */
  contaPadraoId: string;
  podeEscrever: boolean;
  onNova: () => void;
  onEditar: (conta: ContaFinanceira) => void;
  onAlternarAtivo: (conta: ContaFinanceira) => void;
}
