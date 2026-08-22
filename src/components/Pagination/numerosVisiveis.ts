/** Números de página visíveis, com reticências para listas longas.
 *
 * Sempre mostra a primeira, a última e as vizinhas da atual -- é a mesma
 * regra do artifact (`visiblePageNumbers`).
 *
 * Fora do componente porque é dado derivado, testável sem montar React.
 */
export function numerosVisiveis(pagina: number, totalPaginas: number): (number | "...")[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }
  const candidatos = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1]);
  const ordenados = [...candidatos].filter((n) => n >= 1 && n <= totalPaginas).sort((a, b) => a - b);
  const resultado: (number | "...")[] = [];
  let anterior = 0;
  for (const n of ordenados) {
    if (anterior && n - anterior > 1) resultado.push("...");
    resultado.push(n);
    anterior = n;
  }
  return resultado;
}
