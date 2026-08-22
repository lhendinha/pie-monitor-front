/** Iniciais de um nome, pra avatar.
 *
 * Duas letras de palavras diferentes quando há mais de uma -- "Ana Paula"
 * vira "AP". Com uma palavra só, as duas primeiras letras: "Ana" vira "AN".
 * Nome vazio devolve "?" em vez de string vazia, senão o avatar aparece
 * como um círculo em branco e parece bug.
 */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return (partes[0] || "?").slice(0, 2).toUpperCase();
}
