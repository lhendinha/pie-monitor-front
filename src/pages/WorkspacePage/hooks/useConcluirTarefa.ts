import { useMutation, useQueryClient } from "@tanstack/react-query";

import { atualizarTarefa, listarQuadro } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type { ColunaDoQuadro, Tarefa } from "../../../types";

/** Conclui uma tarefa.
 *
 * "Concluída" não é campo da tarefa: é estar na coluna MARCADA como
 * conclusão, e essa coluna varia por subgrupo. Então concluir é descobrir
 * qual é a coluna do quadro daquele subgrupo e mover a tarefa pra lá.
 *
 * O quadro entra no cache do React Query pela chave do subgrupo: a primeira
 * conclusão de cada subgrupo custa duas requisições, as seguintes custam
 * uma. Quadro muda raramente -- só `admin` edita coluna.
 */
export function useConcluirTarefa(aoConcluir: () => void, aoFalhar: (erro: unknown) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefa: Tarefa) => {
      const quadro = await queryClient.fetchQuery<{ colunas: ColunaDoQuadro[] }>({
        queryKey: qk.quadro(tarefa.subgrupo_id),
        queryFn: () => listarQuadro(tarefa.subgrupo_id),
        staleTime: 5 * 60 * 1000,
      });
      const conclusao = quadro.colunas.find((c) => c.e_conclusao);
      if (!conclusao) {
        // Quadro sem coluna de conclusão é configuração incompleta, e só
        // `admin` conserta. Falhar com a razão é melhor que mover a tarefa
        // pra uma coluna qualquer.
        throw new Error("Este subgrupo não tem coluna de conclusão definida no quadro.");
      }
      return atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, {
        coluna_id: conclusao.coluna_id,
      });
    },
    onSuccess: aoConcluir,
    onError: aoFalhar,
  });
}
