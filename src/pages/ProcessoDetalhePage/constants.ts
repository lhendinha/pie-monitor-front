/** Quantas movimentações a página mostra por vez.
 *
 * Cinco porque cada item traz o texto da publicação num bloco de até 200px:
 * com dez, o cartão sozinho já passa de uma tela cheia.
 */
export const MOVIMENTACOES_POR_PAGINA = 5;

/** Passos do "Por página" das movimentações. Menores que os das listagens
 * porque cada item traz o texto da publicação. */
export const TAMANHOS_MOVIMENTACOES = [5, 10, 20, 50] as const;

/** As quatro abas da tela.
 *
 * A primeira é o padrão: é onde a pessoa cai chegando por link, e é o que
 * responde "que processo é este".
 *
 * ⚠️ "Documentos" entra por ÚLTIMO, depois de Movimentações. A ordem não é
 * alfabética nem cronológica: é a de quem abre um processo -- primeiro o que
 * ele é, depois o que há pra fazer, depois o que o tribunal disse, e por fim
 * o que o escritório guardou.
 */
export const ABAS_DO_PROCESSO = [
  { id: "detalhes", rotulo: "Detalhes" },
  { id: "tarefas", rotulo: "Tarefas" },
  { id: "movimentacoes", rotulo: "Movimentações" },
  { id: "documentos", rotulo: "Documentos" },
] as const;

/** O prefixo dos ids de acessibilidade que ligam cada aba ao seu painel.
 *
 * Existe porque duas listas de abas podem coexistir numa página -- ver
 * `utils/abas`. */
export const GRUPO_DE_ABAS = "processo";

/** O id da movimentação aberta, na URL (`?comunicacao=123`).
 *
 * 🔴 Pelo mesmo motivo da aba, e mais um: a movimentação passou a ser a
 * COISA que se abre nesta tela, e coisa que se abre precisa de endereço.
 * Sem isto, "olha essa intimação" só se resolve mandando o número do
 * processo e pedindo pra pessoa procurar na lista -- e um F5 com o teor na
 * tela voltava pro começo.
 *
 * ⚠️ Mesmo NOME de parâmetro que o e-mail do robô já usa
 * (`check_service` monta `?processo={n}&comunicacao={id}`), de propósito --
 * um vocabulário só pra "qual comunicação". Não é o mesmo LINK: aquele cai
 * na raiz e `parseDeepLinkHistorico` o manda pro Histórico, que mostra a
 * notificação. Este abre o teor no próprio processo.
 */
export const PARAM_DA_COMUNICACAO = "comunicacao";
