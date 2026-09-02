import type { ValorDeFormulario } from "../types";

/** Dois valores de formulário são o mesmo?
 *
 * 🔴 **Nasceu de `camposAlterados`, que já tinha a regra certa escrita** --
 * lista por conteúdo e ordem, o resto por identidade. Saiu de lá porque a
 * guarda de descarte precisa da mesma pergunta, e duas cópias da regra de
 * igualdade divergiriam no primeiro ajuste.
 *
 * ⚠️ **Lista compara por CONTEÚDO E ORDEM.** Reordenar sem acrescentar nem
 * tirar conta como mudança -- é o mais seguro dos dois erros, e a razão está
 * escrita em `camposAlterados`: mandar de volta o que já está lá é inócuo,
 * deixar de mandar o que mudou perde a edição.
 *
 * ⚠️ **Lista contra não-lista é DIFERENTE**, e cai no `Object.is` por
 * construção: nenhum array é idêntico a um escalar.
 *
 * ⚠️ **`Object.is`, e não `===`.** Diferem em dois pontos, e os dois foram
 * pesados:
 *
 * - `NaN` é igual a `NaN` aqui, e com `===` não seria. Para uma guarda de
 *   descarte é o que se quer: um campo numérico que virou `NaN` ficaria
 *   "alterado" para sempre, e a pessoa não conseguiria mais fechar o modal.
 * - `-0` é diferente de `0` aqui, e com `===` não seria. Aceito: nenhum campo
 *   do sistema produz `-0` -- os valores vêm de `<input>`, como texto.
 *
 * Para os campos que `camposAlterados` compara (só `string` e `string[]`), os
 * dois operadores dão exatamente o mesmo resultado -- por isso a extração não
 * muda o comportamento dele.
 */
export function mesmoValor(a: ValorDeFormulario, b: ValorDeFormulario): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  }
  return Object.is(a, b);
}
