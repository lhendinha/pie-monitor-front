import { useQuery } from "@tanstack/react-query";

import { listarTarefas } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type {
  RespostaDeTarefas,
} from "../../../types/respostas";

/** As tarefas abertas neste processo.
 *
 * Vive num hook porque DOIS lugares da página precisam da mesma lista: o
 * cartão que a mostra e o diálogo de exclusão, que avisa quantas tarefas
 * ficam sem processo. Com a chave igual, o React Query serve as duas com
 * uma requisição só -- duas declarações de `useQuery` soltas dariam no
 * mesmo resultado hoje e divergiriam no primeiro ajuste.
 */
export function useTarefasDoProcesso(numeroProcesso: string) {
  return useQuery<RespostaDeTarefas>({
    queryKey: qk.tarefasDoProcesso(numeroProcesso),
    queryFn: () => listarTarefas({ processoNumero: numeroProcesso, tamanhoPagina: 100 }),
  });
}
