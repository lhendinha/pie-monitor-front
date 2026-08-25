import { ORDEM_DAS_PRIORIDADES } from "../../constants/prioridade";
import type { PrioridadeDaTarefa, Tarefa } from "../../types";

function pesoDaPrioridade(prioridade: string): number {
  const indice = ORDEM_DAS_PRIORIDADES.indexOf(prioridade as PrioridadeDaTarefa);
  // Prioridade desconhecida vai pro fim, nunca pro topo: um valor novo no
  // servidor não pode empurrar tudo pra baixo por acidente.
  return indice === -1 ? ORDEM_DAS_PRIORIDADES.length : indice;
}

/** Agrupa as tarefas por `data` (`aaaa-mm-dd`), já ordenadas por prioridade.
 *
 * Um Map montado UMA vez por consulta, em vez de peneirar o array inteiro
 * para cada célula: a grade do mês tem 42 células, e filtrar dentro de cada
 * uma varreria a lista 42 vezes.
 */
export function agruparPorDia(tarefas: Tarefa[]): Map<string, Tarefa[]> {
  const porDia = new Map<string, Tarefa[]>();
  for (const tarefa of tarefas) {
    if (!tarefa.data) continue;
    const doDia = porDia.get(tarefa.data);
    if (doDia) doDia.push(tarefa);
    else porDia.set(tarefa.data, [tarefa]);
  }
  for (const doDia of porDia.values()) {
    doDia.sort((a, b) => {
      const peso = pesoDaPrioridade(a.prioridade) - pesoDaPrioridade(b.prioridade);
      // Desempate estável pelo título: sem ele, duas tarefas de mesma
      // prioridade trocam de lugar entre renders e a lista "pisca".
      return peso !== 0 ? peso : a.titulo.localeCompare(b.titulo, "pt-BR");
    });
  }
  return porDia;
}
