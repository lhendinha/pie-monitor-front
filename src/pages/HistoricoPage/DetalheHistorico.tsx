import { useQuery } from "@tanstack/react-query";
import { detalhesProcesso } from "../../services";
import { qk } from "../../services/queryKeys";
import { ComunicacaoCard } from "../../components";
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

  const meta = [
    formatarDataHora(item.enviado_em),
    item.tipo_comunicacao,
    item.nome_orgao,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ComunicacaoCard
      titulo={mascararNumeroProcesso(item.numero_processo)}
      meta={meta}
      destinatarios={item.destinatarios && item.destinatarios.length > 0 ? item.destinatarios.join(", ") : undefined}
      carregando={carregando}
      erro={erro}
      html={comunicacao?.texto}
      textoPlano={comunicacao === null ? item.mensagem : undefined}
    />
  );
}
