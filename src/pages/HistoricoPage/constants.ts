/** Os filtros de tipo do histórico.
 *
 * "Todos" primeiro: é o mais abrangente, e um menu que começa pelo geral e
 * desce pro específico se lê sem pensar.
 *
 * ⚠️ `id` e `valor` são coisas diferentes de propósito. `valor` é o que vai
 * pra API, e o de "Todos" é vazio (sem filtro) -- mas item de menu com
 * `value=""` não é registrado pelo zag, então ele simplesmente não
 * selecionava. O `id` existe pra dar a cada opção uma identidade não vazia.
 */
export const TIPOS_DE_ENVIO = [
  { id: "todos", valor: "", rotulo: "Todos" },
  { id: "movimentacao", valor: "movimentacao", rotulo: "Movimentações" },
  { id: "lembrete", valor: "lembrete", rotulo: "Lembretes" },
] as const;

/** A tela abre filtrada em Movimentações: é o que se olha no dia a dia.
 * Lembrete é diário e dominaria a lista.
 *
 * ⚠️ Filtro que nasce ligado precisa PARECER ligado -- senão a pessoa vê
 * uma lista incompleta achando que está vendo tudo. Daí a pílula já nascer
 * no estado ativo, e a opção escolhida ficar realçada no menu. */
export const TIPO_DE_ENVIO_PADRAO = "movimentacao";
