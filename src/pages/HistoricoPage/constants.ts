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


/** As duas pílulas que a Área de trabalho aciona.
 *
 * 🔴 Existem porque os cards abriam a lista errada: "Envios com falha: 2"
 * abria o histórico inteiro e "Movimentações (7 dias): 3" abria todas as
 * movimentações de sempre. Medido em 26/08/2026: 2 contra 6, e 3 contra 4.
 *
 * ⚠️ Mesmo padrão de `TIPOS_DE_ENVIO` acima: `id` não vazio (o zag não
 * registra item de menu com `value=""`) e `valor` sendo o que vai pra API.
 */
export const FILTROS_DE_FALHA = [
  { id: "todos", valor: false, rotulo: "Todos os envios" },
  { id: "falha", valor: true, rotulo: "Só com falha" },
] as const;

/** A janela de "Movimentações (N dias)" do card da Área de trabalho.
 *
 * ⚠️ UM lugar, usado pelo rótulo E pelo `dias` que vai pra API. Dois
 * literais divergiriam no primeiro ajuste, e aí o card voltaria a anunciar
 * uma janela diferente da que a lista aplica.
 *
 * (No servidor o mesmo número é `resumo_service.DIAS_DA_JANELA_DE_MOVIMENTACOES`.
 * Não dá pra unificar através da fronteira sem a API devolver a janela na
 * resposta -- e o nome do campo `movimentacoes_7_dias` já congela o 7 no
 * contrato de qualquer forma.)
 */
export const DIAS_DA_JANELA_RECENTE = 7;

export const FILTROS_DE_PERIODO = [
  { id: "todos", valor: 0, rotulo: "Todos os períodos" },
  { id: "recente", valor: DIAS_DA_JANELA_RECENTE, rotulo: `Últimos ${DIAS_DA_JANELA_RECENTE} dias` },
] as const;
