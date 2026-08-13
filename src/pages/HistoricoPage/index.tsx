import { useEffect, useState } from "react";
import { listarHistorico, ApiError } from "../../services";
import { mascararNumeroProcesso, formatarDataHora } from "../../utils";
import { Skeleton } from "../../components";
import type { HistoricoItem } from "../../types";

interface PageProps {
  onAutenticacaoInvalida: () => void;
}

export default function HistoricoPage({ onAutenticacaoInvalida }: PageProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarHistorico()
      .then((d: any) => setHistorico(d.historico || []))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
        else setErro("Não foi possível carregar o histórico.");
      })
      .finally(() => setCarregando(false));
  }, [onAutenticacaoInvalida]);

  return (
    <>
      <div className="section-head">
        <h2>Histórico de e-mails enviados</h2>
        <span className="section-count">{carregando ? "carregando…" : `${historico.length} envio(s)`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton linhas={4} />
      ) : historico.length === 0 ? (
        <div className="empty">Nenhuma notificação enviada ainda.</div>
      ) : (
        <ul className="simple-list">
          {historico.map((h, i) => (
            <li className="simple-row simple-row-block" key={`${h.numero_processo}-${h.enviado_em}-${i}`}>
              <div className="simple-row-title">{mascararNumeroProcesso(h.numero_processo)}</div>
              <div className="simple-row-meta">
                {formatarDataHora(h.enviado_em)}
                {h.tipo_comunicacao ? ` · ${h.tipo_comunicacao}` : ""}
                {h.nome_orgao ? ` · ${h.nome_orgao}` : ""}
              </div>
              {h.destinatarios && h.destinatarios.length > 0 && (
                <div className="simple-row-meta">Pra: {h.destinatarios.join(", ")}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
