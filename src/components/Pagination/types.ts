export interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  /** Total de itens, não da página. É o que decide se a barra aparece: com
   * menos itens que o menor tamanho possível, não há o que paginar nem o
   * que escolher. */
  total: number;
  tamanhoPagina: number;
  onMudarPagina: (pagina: number) => void;
  onMudarTamanho: (tamanho: number) => void;
  /** Opções do "Por página". O padrão serve às listagens; o detalhe do
   * processo usa passos menores porque cada item ali é alto. */
  tamanhos?: readonly number[];
}
