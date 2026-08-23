import type { OpcaoProcesso } from "../../../types";

/** `ordem` do item movido = ponto médio entre os vizinhos na posição de
 * destino.
 *
 * Assim só ESSE item precisa ser gravado, em vez de reindexar a lista
 * inteira (N-1 PATCHs a cada arrastada). Nas pontas, onde falta um vizinho,
 * usa o que existe ± 1.
 */
export function calcularOrdemAposMover(
  vizinhoAnterior: OpcaoProcesso | undefined,
  vizinhoSeguinte: OpcaoProcesso | undefined,
): number {
  if (vizinhoAnterior && vizinhoSeguinte) return (vizinhoAnterior.ordem + vizinhoSeguinte.ordem) / 2;
  if (vizinhoAnterior) return vizinhoAnterior.ordem + 1;
  if (vizinhoSeguinte) return vizinhoSeguinte.ordem - 1;
  return 1;
}
