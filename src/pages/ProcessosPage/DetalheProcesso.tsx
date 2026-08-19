import { useQuery } from "@tanstack/react-query";
import { detalhesProcesso } from "../../services";
import { qk } from "../../services/queryKeys";
import { Skeleton, ComunicacaoCard } from "../../components";
import { formatarData } from "../../utils";
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
        <li key={`${c.comunicacao_id}-${i}`}>
          <ComunicacaoCard
            titulo={c.tipo_comunicacao || "Comunicação"}
            meta={`${formatarData(c.data_disponibilizacao)} · ${c.nome_orgao}`}
            html={c.texto}
          />
        </li>
      ))}
    </ul>
  );
}
