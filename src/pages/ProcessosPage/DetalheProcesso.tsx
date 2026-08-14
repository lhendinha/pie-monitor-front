import { useEffect, useState } from "react";
import { detalhesProcesso } from "../../services";
import { Skeleton } from "../../components";
import type { Comunicacao } from "../../types";

interface DetalheProcessoProps {
  numero: string;
  grupoAlvo: string;
}

export default function DetalheProcesso({ numero, grupoAlvo }: DetalheProcessoProps) {
  const [dados, setDados] = useState<{ comunicacoes: Comunicacao[] } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    detalhesProcesso(numero, grupoAlvo)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar."))
      .finally(() => setCarregando(false));
  }, [numero, grupoAlvo]);

  if (carregando) return <Skeleton linhas={2} />;
  if (erro) return <div className="empty">{erro}</div>;
  if ((dados?.comunicacoes || []).length === 0) {
    return <div className="empty">Nenhuma comunicação registrada ainda pra esse processo.</div>;
  }

  return (
    <ul className="simple-list">
      {dados!.comunicacoes.map((c, i) => (
        <li className="simple-row simple-row-card" key={`${c.comunicacao_id}-${i}`}>
          <div className="simple-row-title">{c.tipo_comunicacao || "Comunicação"}</div>
          <div className="simple-row-meta">
            {c.data_disponibilizacao} · {c.nome_orgao}
          </div>
          {c.texto && <p className="detail-texto">{c.texto}</p>}
        </li>
      ))}
    </ul>
  );
}
