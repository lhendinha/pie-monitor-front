import { useQuery } from "@tanstack/react-query";

import { listarProcessos } from "../../../services";
import { todasAsPaginas } from "../../../utils/paginacao";
import { qk } from "../../../services/queryKeys";
import type { Processo } from "../../../types";

/** TODOS os processos deste cliente (`GET /processos?cliente_id=X`).
 *
 * 🔴 Era `listarProcessos({ clienteId })` sem `tamanhoPagina`, e o ramo
 * FILTRADO do `processos_router` tem default 10 (`Query(10, ge=1, le=100)`)
 * -- não 100 como os outros catálogos. Um cliente com 25 processos mostrava
 * 10 no cartão "Processos vinculados", sem paginação, e o diálogo de
 * exclusão dizia "está vinculado a 10 processos".
 *
 * O diálogo é o pior lado: ele existe pra dizer o que impede a exclusão, e
 * dizia um número menor que o real. Quem desvinculasse os 10 informados
 * tomaria 409 de novo, sem entender.
 *
 * O cartão e o diálogo compartilham a chave de propósito -- uma requisição
 * só serve os dois.
 */
export function useProcessosDoCliente(clienteId: string) {
  return useQuery({
    queryKey: qk.todosOsProcessosDoCliente(clienteId),
    queryFn: () =>
      todasAsPaginas<Processo>(
        (opcoes) => listarProcessos({ ...opcoes, clienteId }),
        "processos",
      ),
  });
}
