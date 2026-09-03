/** Uma opção do menu de filtro do Histórico.
 *
 * Fora do `index.tsx` pela regra do projeto. Privada desta pasta: quem a usa
 * é só o `FiltroDeMenu`. */
export interface OpcaoDeFiltro<T> {
  /** Identidade não vazia da opção.
   *
   * ⚠️ Separada de `valor` de propósito: o "Todos" de cada filtro tem valor
   * vazio/falso/zero, e item de menu com `value=""` o zag não registra --
   * ele simplesmente não selecionava. */
  id: string;
  valor: T;
  rotulo: string;
}
