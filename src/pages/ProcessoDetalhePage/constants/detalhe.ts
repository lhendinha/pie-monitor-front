/** Quantas movimentações a página mostra por vez.
 *
 * Cinco porque cada item traz o texto da publicação num bloco de até 200px:
 * com dez, o cartão sozinho já passa de uma tela cheia.
 */
export const MOVIMENTACOES_POR_PAGINA = 5;

/** Passos do "Por página" das movimentações. Menores que os das listagens
 * porque cada item traz o texto da publicação. */
export const TAMANHOS_MOVIMENTACOES = [5, 10, 20, 50] as const;
