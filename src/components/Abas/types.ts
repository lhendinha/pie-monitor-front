/** Uma aba da barra: o que a identifica e o que se lê nela.
 *
 * Fora do `index.tsx` pela regra do projeto -- não são as props do
 * componente, que continuam em `AbasProps`, junto dele. */
export interface Aba<T extends string> {
  id: T;
  rotulo: string;
}
