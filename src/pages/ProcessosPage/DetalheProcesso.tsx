import { useEffect, useState } from "react";
import { detalhesProcesso } from "../../services";
import { mascararNumeroProcesso } from "../../utils";
import { Skeleton } from "../../components";
import type { Comunicacao } from "../../types";

interface DetalheProcessoProps {
  numero: string;
  grupoAlvo: string;
  onFechar: () => void;
}

export default function DetalheProcesso({ numero, grupoAlvo, onFechar }: DetalheProcessoProps) {
  const [dados, setDados] = useState<{ comunicacoes: Comunicacao[] } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    detalhesProcesso(numero, grupoAlvo)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar."))
      .finally(() => setCarregando(false));
  }, [numero, grupoAlvo]);

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div className="docket-numero">{mascararNumeroProcesso(numero)}</div>
        <button className="icon-btn" onClick={onFechar} title="Fechar">
          ✕
        </button>
      </div>
      {carregando ? (
        <Skeleton linhas={2} />
      ) : erro ? (
        <div className="banner">{erro}</div>
      ) : (dados?.comunicacoes || []).length === 0 ? (
        <div className="empty">Nenhuma comunicação registrada ainda pra esse processo.</div>
      ) : (
        <ul className="simple-list">
          {dados!.comunicacoes.map((c, i) => (
            <li className="simple-row simple-row-block" key={`${c.comunicacao_id}-${i}`}>
              <div className="simple-row-title">{c.tipo_comunicacao || "Comunicação"}</div>
              <div className="simple-row-meta">
                {c.data_disponibilizacao} · {c.nome_orgao}
              </div>
              {c.texto && <p className="detail-texto">{c.texto}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
