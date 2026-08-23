import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
} from "../services";
import { qk } from "../services/queryKeys";
import type { RespostaDoSino } from "../types/respostas";
import { useCanalDeNotificacoes } from "./useCanalDeNotificacoes";

/** O sino inteiro: a lista, a contagem e as duas ações.
 *
 * A CONSULTA é a fonte da verdade; o canal em tempo real só antecipa. Por
 * isso o push não INSERE nada na lista -- ele manda buscar de novo. Assim
 * existe um caminho só de leitura, e uma mensagem perdida (rede, aba
 * suspensa, WebSocket bloqueado) se corrige sozinha na consulta seguinte.
 *
 * Inserir direto seria mais rápido, mas criaria dois formatos de verdade e
 * a possibilidade de a lista divergir do servidor sem ninguém perceber.
 */
export function useNotificacoes() {
  const queryClient = useQueryClient();

  const query = useQuery<RespostaDoSino>({
    queryKey: qk.notificacoes(),
    queryFn: () => listarNotificacoes() as Promise<RespostaDoSino>,
    /* Volta a buscar quando a aba ganha foco. É o que faz o sino ficar
       correto mesmo sem o canal -- se o WebSocket falhar, a pessoa ainda vê
       o aviso ao voltar pro sistema. */
    refetchOnWindowFocus: true,
  });

  /** Estável: o hook do canal guarda esta função por toda a vida da
     conexão, e uma função nova a cada render reabriria o WebSocket sem
     parar. */
  const recarregar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.notificacoes() });
  }, [queryClient]);

  useCanalDeNotificacoes(recarregar);

  const lerUma = useMutation({
    mutationFn: (notificacaoId: string) => marcarNotificacaoLida(notificacaoId),
    /* Sem toast: marcar como lida é consequência de abrir a notificação,
       não uma ação que a pessoa pediu. Um aviso a cada clique seria ruído.
       Se falhar, a notificação continua não lida -- que é o estado
       verdadeiro. */
    onSettled: recarregar,
  });

  const lerTodas = useMutation({
    mutationFn: () => marcarTodasLidas(),
    onSettled: recarregar,
  });

  return {
    notificacoes: query.data?.notificacoes ?? [],
    naoLidas: query.data?.nao_lidas ?? 0,
    /* O servidor diz quanto carregou. Quando a contagem bate o teto, o
       badge mostra "N+" -- quem tem cinquenta avisos não lidos não precisa
       do número exato. */
    limite: query.data?.limite ?? 0,
    carregando: query.isPending,
    erro: query.isError,
    recarregar: () => query.refetch(),
    marcarLida: lerUma.mutate,
    marcarTodasLidas: lerTodas.mutate,
    marcandoTodas: lerTodas.isPending,
  };
}
