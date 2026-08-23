/** Prioridade de tarefa -- compartilhada entre Kanban e Agenda.
 *
 * Saiu de `KanbanPage/constants/kanban.ts` quando a Agenda passou a mostrar
 * as mesmas tarefas: duas cópias da escala divergiriam no primeiro ajuste,
 * e a tarefa "Alta" ficaria vermelha num lugar e âmbar no outro. Mesmo
 * caminho que os períodos já tinham feito.
 */

/** Ordem do SELETOR, como no artifact: a lista cresce em urgência. */
export const PRIORIDADES = ["Baixa", "Média", "Alta"] as const;

export type Prioridade = (typeof PRIORIDADES)[number];

/** Ordem de EXIBIÇÃO numa lista: o que urge primeiro.
 *
 * Derivada do seletor, e não escrita à mão: são as mesmas três palavras, e
 * duas listas soltas ficariam fora de acordo assim que uma quarta
 * prioridade aparecesse.
 */
export const ORDEM_DAS_PRIORIDADES = [...PRIORIDADES].reverse() as Prioridade[];

/** Cor da prioridade: a tarja à esquerda do cartão, o ponto no rodapé e a
 * etiqueta da Agenda.
 *
 * Vermelho, âmbar e cinza -- a mesma escala de urgência do resto do
 * sistema. Baixa é cinza de propósito: prioridade baixa não deve competir
 * por atenção num quadro cheio. */
export const CORES_DA_PRIORIDADE: Record<string, string> = {
  Alta: "status.bad",
  Média: "status.warn",
  Baixa: "fg.subtle",
};
