/** Qualquer item ordenável: uma opção de Fase/Situação ou uma coluna do
 * quadro. A conta só precisa da `ordem`, e pedir a entidade inteira
 * prenderia o helper a uma delas. */
interface ComOrdem {
  ordem: number;
}

/** `ordem` do item movido = ponto médio entre os vizinhos na posição de
 * destino.
 *
 * Assim só ESSE item precisa ser gravado, em vez de reindexar a lista
 * inteira (N-1 PATCHs a cada arrastada). Nas pontas, onde falta um vizinho,
 * usa o que existe ± 1.
 *
 * Genérico sobre `{ ordem }` porque duas listas arrastáveis precisam da
 * mesma conta: as opções de Fase/Situação e as colunas do quadro Kanban.
 * Duplicar faria as duas divergirem no primeiro ajuste.
 */
export function calcularOrdemAposMover(
  vizinhoAnterior: ComOrdem | undefined,
  vizinhoSeguinte: ComOrdem | undefined,
): number {
  if (vizinhoAnterior && vizinhoSeguinte) return (vizinhoAnterior.ordem + vizinhoSeguinte.ordem) / 2;
  if (vizinhoAnterior) return vizinhoAnterior.ordem + 1;
  if (vizinhoSeguinte) return vizinhoSeguinte.ordem - 1;
  return 1;
}
