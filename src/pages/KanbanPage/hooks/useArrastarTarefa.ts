/** Arrastar um cartão entre colunas: os sensores do dnd-kit, a mutação
 * otimista e o fim do arraste -- a `KanbanPage` fica com o quadro.
 *
 * ➡️ `KanbanPage/index.test.tsx` cobre o arraste com o quadro montado.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { useToast } from "../../../contexts/ToastContext";
import { atualizarTarefa } from "../../../services";
import { toastErroMutation } from "../../../services/queryClient";
import { moverTarefaNaLista } from "../cacheDoQuadro";
import type { Tarefa } from "../../../types";
import type { MoverTarefa } from "../types";

/** `aoAssentar` roda quando o servidor respondeu, com sucesso ou não -- é
 * onde a página invalida as listas. */
export function useArrastarTarefa(aoAssentar: () => void) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const sensors = useSensors(
    /* 4px antes de virar arraste: sem isso, o clique que abre o cartão
       seria engolido pelo início de um arraste de zero pixel. */
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Arrastar cartão entre colunas = um PATCH só com `coluna_id`.
   *
   * ⚠️ O alvo da solta pode ser uma COLUNA ou um CARTÃO -- os cartões são
   * `useSortable`, e todo sortable também é área de solta. Sem resolver
   * isso, largar em cima de outro cartão manda o id do CARTÃO como
   * `coluna_id`, e o servidor recusa com 400 dizendo que a coluna não é do
   * quadro. (Ele recusa coluna de outro quadro de propósito; aqui isso nem
   * chega a acontecer, porque as colunas oferecidas são as do quadro
   * aberto. A validação existe dos dois lados.)
   *
   * ⚠️ Otimista, e não um PATCH solto: sem isto o cartão VOLTA pra coluna
   * de origem no instante da solta e só pula pra nova quando o refetch
   * chega -- um pisca-pisca que parece que o arraste falhou. Assim ele fica
   * onde foi largado, e volta sozinho se o servidor recusar. */
  const moverMutation = useMutation({
    mutationFn: ({ tarefa, destino }: MoverTarefa) =>
      atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, { coluna_id: destino }),
    onMutate: async ({ tarefa, destino }) => {
      // Cancela o que estiver em voo: um refetch chegando depois do carimbo
      // otimista o sobrescreveria com a posição antiga.
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      // 🔴 Só as consultas que guardam LISTA.
      //
      // O prefixo `["tarefas"]` é compartilhado por caches de formatos
      // diferentes: `qk.tarefas(params)` da Área de trabalho guarda
      // `{tarefas, total, total_paginas}` e `qk.tarefasDoProcesso` guarda
      // outro objeto. Sem o predicado, o carimbo otimista chamava `.map`
      // neles, lançava dentro do `onMutate`, e o React Query nem chegava a
      // executar o `mutationFn` -- o cartão não mudava de coluna no servidor
      // e a pessoa via só "Não foi possível mover a tarefa".
      const soListas = { queryKey: ["tarefas"], predicate: (q: Query) => Array.isArray(q.state.data) };
      const anteriores = queryClient.getQueriesData<Tarefa[]>(soListas);
      // Todas as listas em cache, não só a visível: o mesmo cartão aparece
      // em janelas de data diferentes, e deixar uma delas com a coluna
      // velha faz o cartão saltar ao trocar o filtro.
      queryClient.setQueriesData<Tarefa[]>(soListas, (lista) =>
        moverTarefaNaLista(lista, tarefa.tarefa_id, destino),
      );
      return { anteriores };
    },
    onError: (err, _variaveis, contexto) => {
      contexto?.anteriores.forEach(([chave, dados]) => queryClient.setQueryData(chave, dados));
      toastErroMutation(toast, err, "Não foi possível mover a tarefa.");
    },
    onSettled: aoAssentar,
  });

  function handleDragEnd(evento: DragEndEvent) {
    const tarefa = evento.active.data.current?.tarefa as Tarefa | undefined;
    const over = evento.over;
    if (!tarefa || !over) return;
    const tarefaAlvo = over.data.current?.tarefa as Tarefa | undefined;
    const destino = tarefaAlvo ? tarefaAlvo.coluna_id : String(over.id);
    if (!destino || tarefa.coluna_id === destino) return;
    moverMutation.mutate({ tarefa, destino });
  }

  return { sensors, handleDragEnd };
}
