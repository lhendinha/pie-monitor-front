import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listarHistorico, ApiError } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { mascararNumeroProcesso, formatarDataHora } from "../../utils";
import type { DeepLinkHistorico } from "../../utils";
import { Skeleton, Pagination, Modal, useToast } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import DetalheHistorico from "./DetalheHistorico";
import type { HistoricoItem } from "../../types";

interface PageProps {
  deepLink?: DeepLinkHistorico | null;
  onDeepLinkConsumido?: () => void;
}

export default function HistoricoPage({ deepLink, onDeepLinkConsumido }: PageProps) {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [itemAberto, setItemAberto] = useState<HistoricoItem | null>(null);
  const toast = useToast();

  const query = useQuery<{ historico: HistoricoItem[]; total: number; total_paginas: number }>({
    queryKey: qk.historico({ pagina, tamanhoPagina }),
    queryFn: () => listarHistorico({ pagina, tamanhoPagina }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar o histórico.");
  const historico = query.data?.historico || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  // Resolução do deep link do e-mail -- SEPARADA da query paginada normal,
  // pra nunca bloquear nem substituir a lista principal. Busca TODOS os
  // registros daquele processo (não a página atual) e acha o que bate com o
  // comunicacao_id do link. É uma ação one-shot (não um dado declarativo de
  // render), por isso vira mutation em vez de query -- as variáveis do
  // deepLink vão como argumento do mutate (não fechando sobre a prop), pra
  // não pegar um `deepLink` desatualizado se ele mudar antes da resposta
  // chegar.
  const deepLinkMutation = useMutation({
    mutationFn: (variaveis: { processo: string; comunicacaoId: string }) =>
      listarHistorico({ numeroProcesso: variaveis.processo }),
    onSuccess: (d: any, variaveis) => {
      const candidatos: HistoricoItem[] = d.historico || [];
      const encontrado = candidatos.find(
        (h) => String(h.comunicacao_id) === variaveis.comunicacaoId
      );
      if (encontrado) setItemAberto(encontrado);
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
    // Deps proposital: só `deepLink` -- é resolvido uma vez (o App zera o
    // estado depois via onDeepLinkConsumido pra não reabrir sozinho numa
    // próxima visita à aba), não a cada mudança de toast/mutation/etc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink]);

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  return (
    <>
      <div className="section-head">
        <h2>Histórico de e-mails enviados</h2>
        <span className="section-count">{query.isPending ? "carregando…" : `${total} envio(s)`}</span>
      </div>

      {query.isPending ? (
        <Skeleton linhas={4} />
      ) : historico.length === 0 ? (
        <div className="empty">Nenhuma notificação enviada ainda.</div>
      ) : (
        <>
          <ul className="simple-list">
            {historico.map((h, i) => (
              <li className="simple-row simple-row-block" key={`${h.numero_processo}-${h.enviado_em}-${i}`}>
                <button
                  className="simple-row-clickable"
                  onClick={() => setItemAberto(h)}
                >
                  <div className="simple-row-title">{mascararNumeroProcesso(h.numero_processo)}</div>
                  <div className="simple-row-meta">
                    {formatarDataHora(h.enviado_em)}
                    {h.tipo_comunicacao ? ` · ${h.tipo_comunicacao}` : ""}
                    {h.nome_orgao ? ` · ${h.nome_orgao}` : ""}
                  </div>
                  {h.destinatarios && h.destinatarios.length > 0 && (
                    <div className="simple-row-meta">Pra: {h.destinatarios.join(", ")}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            tamanhoPagina={tamanhoPagina}
            onMudarPagina={setPagina}
            onMudarTamanho={handleMudarTamanho}
          />
        </>
      )}

      {itemAberto && (
        <Modal titulo="Detalhes do envio" onFechar={() => setItemAberto(null)}>
          <DetalheHistorico item={itemAberto} />
        </Modal>
      )}
    </>
  );
}
