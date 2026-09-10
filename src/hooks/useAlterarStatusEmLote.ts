/** Muda o status de muitas tarefas de uma vez -- todas para a MESMA coluna.
 *
 * 🔴 Invalida `["tarefas"]` E o resumo, pela mesma razão de
 * `useExcluirTarefasEmLote`: o card e a contagem do "Resumo rápido" falam do
 * MESMO conjunto, e atualizar um só faria a tela contar duas histórias.
 *
 * ⚠️ `aoTerminar` recebe também o que foi ENVIADO: é dali que o Desfazer monta
 * a chamada inversa -- a coluna, de onde cada tarefa saiu.
 *
 * ➡️ `lotesDeTarefas.test.tsx`; `PLANO_ACOES_EM_LOTE.md`, Fase 8.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { alterarStatusEmLote } from "../services";
import { qk } from "../services/queryKeys";
import { paraOLote } from "../utils/selecao";
import type { PedidoDeStatusEmLote, ResultadoDoStatus } from "../types";

export function useAlterarStatusEmLote(
  aoTerminar: (resultado: ResultadoDoStatus, pedido: PedidoDeStatusEmLote) => void,
  aoFalhar: (erro: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tarefas, colunaId }: PedidoDeStatusEmLote) =>
      alterarStatusEmLote(paraOLote(tarefas), colunaId),
    onSuccess: (resultado, pedido) => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      queryClient.invalidateQueries({ queryKey: qk.resumo() });
      aoTerminar(resultado, pedido);
    },
    onError: aoFalhar,
  });
}
