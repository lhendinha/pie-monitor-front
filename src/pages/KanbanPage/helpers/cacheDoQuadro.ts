import type { Tarefa } from "../../../types";

/** Devolve a lista com a tarefa movida pra outra coluna.
 *
 * Pura, e separada da tela, por dois motivos: é o que o carimbo otimista do
 * arraste faz em CADA lista em cache, e é a única parte do arraste que dá
 * pra testar de verdade fora do navegador -- o gesto do `dnd-kit` depende
 * de medidas de layout que o jsdom não fornece.
 *
 * `undefined` entra e sai: `setQueriesData` chama o atualizador também pra
 * chaves sem dado, e devolver `[]` ali criaria cache vazio pra consulta que
 * nem rodou -- o quadro apareceria sem cartão nenhum.
 */
export function moverTarefaNaLista(
  tarefas: Tarefa[] | undefined,
  tarefaId: string,
  destino: string,
): Tarefa[] | undefined {
  return tarefas?.map((t) => (t.tarefa_id === tarefaId ? { ...t, coluna_id: destino } : t));
}
