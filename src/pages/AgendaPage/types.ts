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
  /** "todas", "sem" (sem responsável) ou o e-mail de alguém -- mesmos
   * valores do Kanban, pra que as duas telas não divirjam. */
  pessoa: string;
}
