import { useMutation } from "@tanstack/react-query";

import { atualizarTarefa } from "../../../services";
import type { AssumirTarefa } from "../types";

/** Assume uma tarefa sem dono: grava o próprio e-mail como responsável.
 *
 * Uma requisição só -- diferente de concluir, que precisa antes descobrir
 * qual coluna do quadro marca conclusão.
 */
export function useAssumirTarefa(
  aoAssumir: () => void,
  aoFalhar: (erro: unknown) => void,
) {
  return useMutation({
    mutationFn: ({ tarefa, email }: AssumirTarefa) =>
      atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, { responsavel_id: email }),
    onSuccess: aoAssumir,
    onError: aoFalhar,
  });
}
