/** Passa muitas tarefas para uma pessoa de uma vez -- ou devolve todas ao pool.
 *
 * 🔴 Invalida `["tarefas"]` E o resumo, pela mesma razão de
 * `useExcluirTarefasEmLote`: o card e a contagem do "Resumo rápido" falam do
 * MESMO conjunto, e atualizar um só faria a tela contar duas histórias.
 *
 * ⚠️ `aoTerminar` recebe também o que foi ENVIADO: é dali que o Desfazer monta
 * a chamada inversa -- o responsável, de onde cada tarefa saiu.
 *
 * ➡️ `lotesDeTarefas.test.tsx`; `PLANO_ACOES_EM_LOTE.md`, Fase 8.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { atribuirTarefasEmLote } from "../services";
import { qk } from "../services/queryKeys";
import { paraOLote } from "../utils/selecao";
import type { PedidoDeAtribuicaoEmLote, ResultadoDaAtribuicao } from "../types";

export function useAtribuirTarefasEmLote(
  aoTerminar: (resultado: ResultadoDaAtribuicao, pedido: PedidoDeAtribuicaoEmLote) => void,
  aoFalhar: (erro: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tarefas, responsavelId }: PedidoDeAtribuicaoEmLote) =>
      atribuirTarefasEmLote(paraOLote(tarefas), responsavelId),
    onSuccess: (resultado, pedido) => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      queryClient.invalidateQueries({ queryKey: qk.resumo() });
      aoTerminar(resultado, pedido);
    },
    onError: aoFalhar,
  });
}
