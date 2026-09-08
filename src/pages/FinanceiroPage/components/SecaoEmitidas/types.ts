import type { PaginationProps } from "../../../../components/Pagination/types";
import type { Fatura } from "../../../../types";

export interface SecaoEmitidasProps {
  /** Só as da PÁGINA atual: a lista vem de `GET /faturas`, uma página por
   * vez, lida do índice estreito. */
  faturas: Fatura[];
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
  /** Repassado inteiro ao `Pagination`, que decide sozinho se aparece
   * (some abaixo de 11 faturas) e corrige a página que deixou de existir. */
  paginacao: PaginationProps;
  /** O nome do cliente, resolvido por quem chama -- a fatura traz só o id. */
  nomeDoCliente: (clienteId: string) => string;
  onAbrir: (faturaId: string) => void;
}
