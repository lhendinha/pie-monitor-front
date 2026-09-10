/** Apaga muitas tarefas de uma vez, e conta o que NÃO saiu.
 *
 * 🔴 Compartilhado pelas três telas de propósito. A Área de trabalho, a
 * Agenda e o Kanban chamam o mesmo lote, e três cópias divergiriam na
 * primeira mudança de frase -- que é justamente a parte que a pessoa lê.
 *
 * ⚠️ Depois de agir invalida `["tarefas"]` E o resumo: o card e a contagem
 * do "Resumo rápido" falam do MESMO conjunto, e atualizar um só faria a tela
 * contar duas histórias.
 *
 * ⚠️ Devolve também as tarefas ENVIADAS, como os outros três hooks do lote.
 * A exclusão não tem Desfazer -- a tarefa voltaria com outro id --, mas o
 * contrato igual é o que deixa um teste só cobrir os quatro.
 *
 * ➡️ `lotesDeTarefas.test.tsx`; `PLANO_ACOES_EM_LOTE.md`, Fase 3.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { removerTarefasEmLote } from "../services";
import { qk } from "../services/queryKeys";
import { paraOLote } from "../utils/selecao";
import type { ResultadoDoLote, Tarefa } from "../types";

export function useExcluirTarefasEmLote(
  aoTerminar: (resultado: ResultadoDoLote, tarefas: Tarefa[]) => void,
  aoFalhar: (erro: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tarefas: Tarefa[]) => removerTarefasEmLote(paraOLote(tarefas)),
    onSuccess: (resultado, tarefas) => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      queryClient.invalidateQueries({ queryKey: qk.resumo() });
      aoTerminar(resultado, tarefas);
    },
    onError: aoFalhar,
  });
}
