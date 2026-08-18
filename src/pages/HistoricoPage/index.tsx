import { useCallback, useEffect, useState } from "react";
import { listarHistorico, ApiError } from "../../services";
import { mascararNumeroProcesso, formatarDataHora } from "../../utils";
import type { DeepLinkHistorico } from "../../utils";
import { Skeleton, Pagination, Modal, useToast } from "../../components";
import DetalheHistorico from "./DetalheHistorico";
import type { HistoricoItem } from "../../types";

interface PageProps {
  onAutenticacaoInvalida: () => void;
  deepLink?: DeepLinkHistorico | null;
  onDeepLinkConsumido?: () => void;
}

const TAMANHO_PADRAO = 10;

export default function HistoricoPage({
  onAutenticacaoInvalida,
  deepLink,
  onDeepLinkConsumido,
}: PageProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PADRAO);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [itemAberto, setItemAberto] = useState<HistoricoItem | null>(null);
  const toast = useToast();

  const carregar = useCallback(() => {
    setCarregando(true);
    listarHistorico({ pagina, tamanhoPagina })
      .then((d: any) => {
        setHistorico(d.historico || []);
        setTotal(d.total ?? 0);
        setTotalPaginas(d.total_paginas ?? 0);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
        else toast.erro("Não foi possível carregar o histórico.");
      })
      .finally(() => setCarregando(false));
  }, [pagina, tamanhoPagina, onAutenticacaoInvalida, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Resolução do deep link do e-mail -- SEPARADA do carregar() paginado
  // normal, pra nunca bloquear nem substituir a lista principal. Busca
  // TODOS os registros daquele processo (não a página atual) e acha o
  // que bate com o comunicacao_id do link.
  useEffect(() => {
    if (!deepLink) return;
    listarHistorico({ numeroProcesso: deepLink.processo })
      .then((d: any) => {
        const candidatos: HistoricoItem[] = d.historico || [];
        const encontrado = candidatos.find(
          (h) => String(h.comunicacao_id) === deepLink.comunicacaoId
        );
        if (encontrado) setItemAberto(encontrado);
        else toast.erro("Não foi possível localizar a notificação do link recebido.");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
        else toast.erro("Não foi possível carregar os detalhes do link recebido.");
      })
      .finally(() => {
        onDeepLinkConsumido?.();
      });
    // Deps proposital: só `deepLink` -- é resolvido uma vez (o App zera o
    // estado depois via onDeepLinkConsumido pra não reabrir sozinho numa
    // próxima visita à aba), não a cada mudança de toast/etc.
  }, [deepLink]);

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  return (
    <>
      <div className="section-head">
        <h2>Histórico de e-mails enviados</h2>
        <span className="section-count">{carregando ? "carregando…" : `${total} envio(s)`}</span>
      </div>

      {carregando ? (
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
