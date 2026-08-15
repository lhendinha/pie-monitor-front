import { useCallback, useEffect, useState } from "react";
import { listarHistorico, ApiError } from "../../services";
import { mascararNumeroProcesso, formatarDataHora } from "../../utils";
import { Skeleton, Pagination, Modal, useToast } from "../../components";
import DetalheHistorico from "./DetalheHistorico";
import type { HistoricoItem } from "../../types";

interface PageProps {
  grupoAlvo: string;
  onAutenticacaoInvalida: () => void;
}

const TAMANHO_PADRAO = 10;

export default function HistoricoPage({ grupoAlvo, onAutenticacaoInvalida }: PageProps) {
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
    listarHistorico({ pagina, tamanhoPagina }, grupoAlvo)
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
  }, [grupoAlvo, pagina, tamanhoPagina, onAutenticacaoInvalida, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
