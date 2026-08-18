import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { detalhesProcesso } from "../../services";
import { qk } from "../../services/queryKeys";
import { Skeleton } from "../../components";
import type { Comunicacao } from "../../types";

interface DetalheProcessoProps {
  numero: string;
}

export default function DetalheProcesso({ numero }: DetalheProcessoProps) {
  // Mesma query key que DetalheHistorico (HistoricoPage) -- os dois chamam
  // o mesmo endpoint (`detalhesProcesso`), então compartilham cache.
  const query = useQuery<{ comunicacoes: Comunicacao[] }>({
    queryKey: qk.detalhesProcesso(numero),
    queryFn: () => detalhesProcesso(numero),
  });

  if (query.isPending) return <Skeleton linhas={2} />;
  if (query.isError) {
    return (
      <div className="empty">
        {query.error instanceof Error ? query.error.message : "Não foi possível carregar."}
      </div>
    );
  }
  const comunicacoes = query.data?.comunicacoes || [];
  if (comunicacoes.length === 0) {
    return <div className="empty">Nenhuma comunicação registrada ainda pra esse processo.</div>;
  }

  return (
    <ul className="simple-list">
      {comunicacoes.map((c, i) => (
        <li className="simple-row simple-row-card" key={`${c.comunicacao_id}-${i}`}>
          <div className="simple-row-title">{c.tipo_comunicacao || "Comunicação"}</div>
          <div className="simple-row-meta">
            {c.data_disponibilizacao} · {c.nome_orgao}
          </div>
          {c.texto && (
            // O texto vem como HTML completo da API do PJe (às vezes um
            // documento inteiro com <html>/<head>/<style>) -- sanitiza com
            // DOMPurify antes de injetar (fonte externa, mesmo sendo órgão
            // oficial) e usa <div>, não <p>, já que o conteúdo tem elementos
            // de bloco (table, section) que quebrariam dentro de um <p>.
            <div
              className="detail-texto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.texto) }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
