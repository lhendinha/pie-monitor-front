/** As quatro visões da Agenda, na ordem em que o artifact as lista. */
export type VisaoDaAgenda = "lista" | "dia" | "semana" | "mes";

/** Estado da barra de filtros da Agenda.
 *
 * `subgrupoIds` vazio significa TODOS os visíveis -- é o que o servidor já
 * entende quando `subgrupo_id` não vai na query, e evita um estado
 * impossível ("nenhum subgrupo") que mostraria uma agenda vazia sem motivo.
 */
export interface FiltrosDaAgenda {
  visao: VisaoDaAgenda;
  subgrupoIds: string[];
  /** Nome de cada id em `subgrupoIds`.
   *
   * 🔴 A pílula só carrega a primeira página de subgrupos, e o `MultiSelect`
   * monta o valor filtrando as opções pelos ids escolhidos: um id fora dessa
   * página SOME do valor -- a pílula cai de "3 selecionados" pra "1" sem
   * ninguém ter desmarcado nada. O nome guardado aqui é o que reconstrói a
   * opção que falta. */
  subgrupoNomes: Record<string, string>;
  /** "todas", "sem" (sem responsável) ou o e-mail de alguém -- mesmos
   * valores do Kanban, pra que as duas telas não divirjam. */
  pessoa: string;
}
