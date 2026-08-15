import DOMPurify from "dompurify";
import { formatarDataHora, mascararNumeroProcesso } from "../../utils";
import type { HistoricoItem } from "../../types";

interface DetalheHistoricoProps {
  item: HistoricoItem;
}

/** Detalhe de UM envio específico -- diferente do modal de "Processos" (que
 * lista TODAS as comunicações de um processo), aqui é só o item clicado.
 * Todo o dado já vem no próprio item da listagem, sem chamada extra à API.
 * Mostra o texto real da comunicação do PJe (item.texto), não o corpo
 * genérico do e-mail -- é isso que a pessoa quer ver ao abrir um item. */
export default function DetalheHistorico({ item }: DetalheHistoricoProps) {
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
      {item.texto ? (
        <div
          className="detail-texto"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.texto) }}
        />
      ) : (
        item.mensagem && (
          <p className="detail-texto" style={{ whiteSpace: "pre-wrap" }}>
            {item.mensagem}
          </p>
        )
      )}
    </div>
  );
}
