/** A tarefa que o link do lembrete aponta: busca direta pelo par
 * subgrupo/tarefa e abre o modal dela UMA vez -- a `KanbanPage` fica com
 * o quadro.
 *
 * ➡️ `KanbanPage/index.test.tsx`, os casos de `tarefaDoLink`.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { detalhesTarefa } from "../../../services";
import { useToastOnQueryError } from "../../../services/queryClient";
import { qk } from "../../../services/queryKeys";
import type { Tarefa } from "../../../types";
import type { TarefaDoLink } from "../types";

/** `abrir` recebe a tarefa quando ela chega; a página a põe no modal. */
export function useTarefaDoLink(tarefaDoLink: TarefaDoLink | undefined, abrir: (tarefa: Tarefa) => void) {
  /** O link já foi consumido -- fechar o modal não pode reabri-lo. */
  const [linkConsumido, setLinkConsumido] = useState(false);

  /** Carrega a tarefa do link direto pelo par que a identifica.
   *
   * ⚠️ NÃO dá pra esperar que ela apareça no quadro: o quadro abre filtrado
   * no mês, e um lembrete de prazo pode ser de uma tarefa fora dessa janela
   * -- justamente as atrasadas, que são as que mais geram lembrete. Buscar
   * a tarefa sozinha é o único caminho que sempre funciona. */
  const tarefaDoLinkQuery = useQuery<Tarefa>({
    queryKey: tarefaDoLink
      ? qk.tarefa(tarefaDoLink.subgrupoId, tarefaDoLink.tarefaId)
      : ["tarefa", "nenhuma"],
    queryFn: () => detalhesTarefa(tarefaDoLink!.subgrupoId, tarefaDoLink!.tarefaId) as Promise<Tarefa>,
    enabled: Boolean(tarefaDoLink) && !linkConsumido,
    /* Link velho aponta pra tarefa que pode ter sido excluída. Retentar um
       404 só atrasa o recado. */
    retry: false,
  });
  useToastOnQueryError(
    tarefaDoLinkQuery.error,
    "Não foi possível abrir a tarefa do link. Ela pode ter sido excluída.",
  );

  /** Abre o modal quando a tarefa do link chega -- uma vez só. */
  useEffect(() => {
    if (tarefaDoLinkQuery.data && !linkConsumido) {
      abrir(tarefaDoLinkQuery.data);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consome o deep link UMA vez quando a tarefa chega; caso listado no eslint.config.js
      setLinkConsumido(true);
    }
  }, [tarefaDoLinkQuery.data, linkConsumido, abrir]);
}
