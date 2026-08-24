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
  // 🔴 A guarda não é paranoia: nem todo cache sob o prefixo `["tarefas"]`
  // guarda um ARRAY. `qk.tarefas(params)` da Área de trabalho guarda
  // `{tarefas, total, total_paginas}`, e `qk.tarefasDoProcesso` também é um
  // objeto. Sem isto, o `.map` lançava `TypeError` DENTRO do `onMutate` --
  // e quando o `onMutate` lança, o React Query nunca chama o `mutationFn`:
  // o arraste falhava com "Não foi possível mover a tarefa" e o PATCH nem
  // saía. Bastava passar pela Área de trabalho (que é a rota inicial) e ir
  // pro Kanban dentro dos 5 min de cache.
  //
  // Quem chama já filtra por `Array.isArray`; isto é a segunda barreira.
  if (!Array.isArray(tarefas)) return tarefas;
  return tarefas.map((t) => (t.tarefa_id === tarefaId ? { ...t, coluna_id: destino } : t));
}
