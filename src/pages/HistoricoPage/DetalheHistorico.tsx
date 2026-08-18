import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { detalhesProcesso } from "../../services";
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
 * salvo no item -- sem endpoint novo, sem duplicar o texto no backend. */
export default function DetalheHistorico({ item }: DetalheHistoricoProps) {
  const [comunicacao, setComunicacao] = useState<Comunicacao | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (item.comunicacao_id == null) {
      setComunicacao(null); // histórico antigo, sem comunicacao_id salvo
      return;
    }
    setComunicacao(undefined);
    detalhesProcesso(item.numero_processo)
      .then((d: any) => {
        const encontrada = (d.comunicacoes || []).find(
          (c: Comunicacao) => String(c.comunicacao_id) === String(item.comunicacao_id)
        );
        setComunicacao(encontrada || null);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar."));
  }, [item.numero_processo, item.comunicacao_id]);

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

      {comunicacao === undefined && <Skeleton linhas={2} />}
      {erro && <div className="empty">{erro}</div>}
      {comunicacao === null && !erro && item.mensagem && (
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
