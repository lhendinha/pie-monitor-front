import type { PaginationProps } from "../../../../components/Pagination/types";
import type { CentroDeCusto } from "../../../../types";

export interface ListaDeCentrosProps {
  /** Só os da PÁGINA atual: a lista vem de `GET /financeiro/centros-de-custo`,
   * e não do catálogo inteiro. */
  centros: CentroDeCusto[];
  /** A consulta da página ainda não voltou -- a tabela dá lugar ao esqueleto. */
  carregando: boolean;
  /** Repassado inteiro ao `Pagination`, que decide sozinho se aparece
   * (some abaixo de 11 itens) e corrige a página que deixou de existir. */
  paginacao: PaginationProps;
  podeEscrever: boolean;
  onNovo: () => void;
  onEditar: (centro: CentroDeCusto) => void;
  onAlternarAtivo: (centro: CentroDeCusto) => void;
}
