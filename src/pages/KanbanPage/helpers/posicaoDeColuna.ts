/** Onde a coluna arrastada pode de fato parar.
 *
 * ⚠️ O `dnd-kit` não sabe da regra: `disabled` no `useSortable` da coluna de
 * conclusão impede ARRASTAR ELA, mas não impede as outras de serem soltas
 * depois dela. Medido no navegador -- arrastar "A Fazer" pro fim mandava
 * `ordem: 4` com a conclusão em 3, e o servidor devolvia 409. O gesto era
 * oferecido e a requisição nascia condenada.
 *
 * Trunca no último lugar ANTES da conclusão em vez de recusar a arrastada:
 * quem puxa o cartão pro fim quer "o mais pra baixo possível", e é isso que
 * ele ganha.
 *
 * Sem coluna de conclusão no quadro (quadro legado), qualquer posição vale.
 */
export function posicaoValidaNoQuadro(
  destinoPretendido: number,
  colunas: readonly { e_conclusao: boolean }[],
): number {
  const conclusao = colunas.findIndex((c) => c.e_conclusao);
  if (conclusao < 0) return destinoPretendido;
  return Math.min(destinoPretendido, Math.max(conclusao - 1, 0));
}
