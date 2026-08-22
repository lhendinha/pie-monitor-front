import { IconeHistorico } from "../../components";
import { formatarData, formatarDataHoraAmPm, mascararNumeroProcesso } from "../../utils";
import type { Processo } from "../../types";

interface Props {
  processo: Processo;
  subgrupoNome: (id: string) => string;
  faseRotulo: (id?: string | null) => string;
  situacaoRotulo: (id?: string | null) => string;
  onAbrir: (p: Processo) => void;
  onVerHistorico: (numero: string) => void;
  onRemover: (p: Processo) => void;
}

/** Uma linha da lista de processos.
 *
 * ⚠️ Os dois botões de ação chamam `stopPropagation`: sem isso, clicar em
 * "Ver histórico" ou "Remover" também dispararia o clique da linha e abriria
 * o modal de edição por cima. Há teste cobrindo cada um dos dois.
 */
export default function ItemProcesso({
  processo: p,
  subgrupoNome,
  faseRotulo,
  situacaoRotulo,
  onAbrir,
  onVerHistorico,
  onRemover,
}: Props) {
  const temTags = p.fase_id || p.situacao_id || p.data_verificar || p.prazo_final;

  return (
    <li className="docket" onClick={() => onAbrir(p)} style={{ cursor: "pointer" }}>
      <div className="docket-main">
        <div className="docket-numero">{mascararNumeroProcesso(p.numero_processo)}</div>
        <div className="docket-apelido">{p.apelido || p.numero_processo}</div>
        <div className="docket-meta">
          {subgrupoNome(p.subgrupo_id)}
          {p.ultima_verificacao
            ? ` · Última verificação: ${formatarDataHoraAmPm(p.ultima_verificacao)}`
            : " · Ainda não verificado"}
        </div>
        {temTags && (
          <div className="docket-tags">
            {p.fase_id && <span className="tag tag-fase">{faseRotulo(p.fase_id)}</span>}
            {p.situacao_id && <span className="tag tag-situacao">{situacaoRotulo(p.situacao_id)}</span>}
            {p.data_verificar && (
              <span className="tag tag-alerta">Verificar {formatarData(p.data_verificar)}</span>
            )}
            {p.prazo_final && (
              <span className="tag tag-alerta">Prazo {formatarData(p.prazo_final)}</span>
            )}
          </div>
        )}
      </div>
      <div className="docket-actions">
        <button
          className="icon-btn"
          title="Ver histórico"
          onClick={(e) => {
            e.stopPropagation();
            onVerHistorico(p.numero_processo);
          }}
        >
          <IconeHistorico />
        </button>
        <button
          className="icon-btn"
          title="Remover"
          onClick={(e) => {
            e.stopPropagation();
            onRemover(p);
          }}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
