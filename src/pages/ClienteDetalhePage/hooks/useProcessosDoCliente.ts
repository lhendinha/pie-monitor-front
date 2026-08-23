import { useQuery } from "@tanstack/react-query";

import { listarProcessos } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type {
  RespostaDeProcessos,
} from "../../../types/respostas";

/** Os processos deste cliente (`GET /processos?cliente_id=X`).
 *
 * Mesmo motivo do `useTarefasDoProcesso`: o cartão que lista e o diálogo de
 * exclusão -- que avisa quantos processos perdem o cliente -- pedem a mesma
 * coisa, e com a chave igual isso é uma requisição só.
 */
export function useProcessosDoCliente(clienteId: string) {
  return useQuery<RespostaDeProcessos>({
    queryKey: qk.processos({ clienteId }),
    queryFn: () => listarProcessos({ clienteId }),
  });
}
