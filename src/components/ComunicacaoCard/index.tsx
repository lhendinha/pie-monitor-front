import DOMPurify from "dompurify";
import Esqueleto from "../Esqueleto";

interface ComunicacaoCardProps {
  titulo: string;
  meta: string;
  destinatarios?: string;
  /** HTML bruto (vem da API do PJe) -- sanitizado aqui com DOMPurify antes
   * de renderizar. */
  html?: string;
  /** Fallback em texto puro, usado quando não há `html` disponível (ex:
   * a comunicação original não foi encontrada, mas o histórico salvou o
   * texto simples do envio). */
  textoPlano?: string;
  carregando?: boolean;
  erro?: string | null;
}

/** Card de UMA comunicação/movimentação -- mesmo layout usado tanto na
 * listagem de "Processos" (uma comunicação por card, várias por processo)
 * quanto no detalhe de um envio específico em "Histórico" (um card só). */
export default function ComunicacaoCard({
  titulo,
  meta,
  destinatarios,
  html,
  textoPlano,
  carregando = false,
  erro = null,
}: ComunicacaoCardProps) {
  return (
    <div className="simple-row-card">
      <div className="simple-row-title">{titulo}</div>
      <div className="simple-row-meta">{meta}</div>
      {destinatarios && <div className="simple-row-meta">Pra: {destinatarios}</div>}

      {carregando && <Esqueleto linhas={2} />}
      {!carregando && erro && <div className="empty">{erro}</div>}
      {!carregando && !erro && html && (
        <div className="detail-texto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
      )}
      {!carregando && !erro && !html && textoPlano && (
        <p className="detail-texto" style={{ whiteSpace: "pre-wrap" }}>
          {textoPlano}
        </p>
      )}
    </div>
  );
}
