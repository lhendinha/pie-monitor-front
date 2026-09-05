/** O link do e-mail resolvido em item do histórico: busca todos os envios
 * do processo e abre o que bate com a comunicação -- a `HistoricoPage`
 * fica com a lista.
 *
 * ➡️ `HistoricoPage/index.test.tsx`, os casos de `deepLink`.
 */
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

import { useToast } from "../../../contexts/ToastContext";
import { ApiError, historicoDoProcesso } from "../../../services";
import type { DeepLinkHistorico, HistoricoItem } from "../../../types";
import type { AlvoDoDeepLink } from "../types";
import type { RespostaDeHistorico } from "../../../types/respostas";

/** `abrir` recebe o item encontrado; `onDeepLinkConsumido` avisa o App de
 * que o link já foi usado, com ou sem sucesso. */
export function useLinkProfundoDoHistorico(
  deepLink: DeepLinkHistorico | null | undefined,
  abrir: (item: HistoricoItem) => void,
  onDeepLinkConsumido?: () => void,
) {
  const toast = useToast();

  /** Resolução do link do e-mail -- SEPARADA da consulta paginada, pra nunca
   * bloquear nem substituir a lista principal. Busca todos os registros
   * daquele processo (não a página atual) e acha o que bate com o
   * `comunicacao_id` do link.
   *
   * É uma ação de uma vez só, e não um dado declarativo de render, por isso
   * é mutation e não query -- e as variáveis vão como argumento do `mutate`
   * (sem fechar sobre a prop) pra não pegar um `deepLink` desatualizado se
   * ele mudar antes de a resposta chegar. */
  const deepLinkMutation = useMutation({
    /* 🔴 `historicoDoProcesso`, e NÃO `listarHistorico({ numeroProcesso })`
       (03/09/2026). A segunda passou a PAGINAR quando o número virou filtro
       de tela -- e este `find` procura no conjunto inteiro. Com a paginada,
       uma notificação a partir do 11º item devolveria "não foi possível
       localizar", que é mentira: ela existe, só não estava na página. */
    mutationFn: (variaveis: AlvoDoDeepLink) =>
      historicoDoProcesso(variaveis.processo) as Promise<RespostaDeHistorico>,
    onSuccess: (d, variaveis) => {
      const encontrado = (d.historico || []).find(
        (h) => String(h.comunicacao_id) === variaveis.comunicacaoId,
      );
      if (encontrado) abrir(encontrado);
      else toast.erro("Não foi possível localizar a notificação do link recebido.");
    },
    onError: (err) => {
      if (!(err instanceof ApiError && err.status === 401)) {
        toast.erro("Não foi possível carregar os detalhes do link recebido.");
      }
    },
    onSettled: () => onDeepLinkConsumido?.(),
  });

  useEffect(() => {
    if (!deepLink) return;
    deepLinkMutation.mutate({ processo: deepLink.processo, comunicacaoId: deepLink.comunicacaoId });
    // Deps proposital: só `deepLink`. É resolvido uma vez (o App zera o
    // estado depois, via `onDeepLinkConsumido`, pra não reabrir sozinho numa
    // próxima visita), não a cada mudança de toast/mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink]);

  return { resolvendo: deepLinkMutation.isPending };
}
