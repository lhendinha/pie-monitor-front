import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { detalhesProcesso } from "../../services";
import { qk } from "../../services/queryKeys";
import { Skeleton } from "../../components";
import { formatarDataHora, mascararNumeroProcesso } from "../../utils";
import type { Comunicacao, HistoricoItem } from "../../types";

interface DetalheHistoricoProps {
  item: HistoricoItem;
}

/** Detalhe de UM envio específico -- diferente do modal de "Processos" (que
 * lista TODAS as comunicações do processo), aqui mostra só a comunicação
 * que gerou essa notificação. Busca pela MESMA rota que o link do e-mail
 * já abre (GET /processos/{numero}/detalhes) e filtra pelo comunicacao_id
 * salvo no item -- sem endpoint novo, sem duplicar o texto no backend.
 * Mesma query key que DetalheProcesso, pra compartilhar cache. */
export default function DetalheHistorico({ item }: DetalheHistoricoProps) {
  const habilitado = item.comunicacao_id != null;

  const query = useQuery<{ comunicacoes: Comunicacao[] }>({
    queryKey: qk.detalhesProcesso(item.numero_processo),
    queryFn: () => detalhesProcesso(item.numero_processo),
    enabled: habilitado,
  });

  const carregando = habilitado && query.isPending;
  const erro =
    habilitado && query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Não foi possível carregar."
      : null;
  // histórico antigo, sem comunicacao_id salvo -> não achado
  const comunicacao = !habilitado
    ? null
    : (query.data?.comunicacoes.find(
        (c) => String(c.comunicacao_id) === String(item.comunicacao_id)
      ) ?? null);

  return (
    <div>
      <div className="simple-row-title">{mascararNumeroProcesso(item.numero_processo)}</div>
      <div className="simple-row-meta">
        {formatarDataHora(item.enviado_em)}
        {item.tipo_comunicacao ? ` · ${item.tipo_comunicacao}` : ""}
        {item.nome_orgao ? ` · ${item.nome_orgao}` : ""}
      </div>
      {item.destinatarios && item.destinatarios.length > 0 && (
        <div className="simple-row-meta">Pra: {item.destinatarios.join(", ")}</div>
      )}

      {carregando && <Skeleton linhas={2} />}
      {erro && <div className="empty">{erro}</div>}
      {!carregando && !erro && comunicacao === null && item.mensagem && (
        <p className="detail-texto" style={{ whiteSpace: "pre-wrap" }}>
          {item.mensagem}
        </p>
      )}
      {comunicacao && comunicacao.texto && (
        <div
          className="detail-texto"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comunicacao.texto) }}
        />
      )}
    </div>
  );
}
