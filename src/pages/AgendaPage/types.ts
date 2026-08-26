/** As quatro visões da Agenda, na ordem em que o artifact as lista. */
export type VisaoDaAgenda = "lista" | "dia" | "semana" | "mes";

/** O recorte de período da Agenda. Por enquanto só "atrasadas" -- a pílula
 * nasce com uma opção porque é a que o card da Área de trabalho precisa. */
export type PeriodoDaAgenda = "todos" | "atrasadas";

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
  /** `"todos"` = a janela da visão manda. `"atrasadas"` = abertas com data
   * anterior a hoje, em QUALQUER dia passado.
   *
   * 🔴 "Atrasadas" não é um filtro dentro da visão: ele IGNORA a janela de
   * datas. Toda visão da Agenda é limitada por um intervalo (dia, semana,
   * 14 dias, grade de 42) e a tela abre no mês corrente -- tarefa atrasada
   * está no passado, então um filtro que respeitasse a janela mostraria
   * ZERO. Por isso ele trava a visão em lista e some com a navegação de
   * datas. */
  periodo: PeriodoDaAgenda;
}
