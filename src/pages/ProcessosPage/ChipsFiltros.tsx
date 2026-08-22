import { LABEL_FILTRO_PROCESSOS } from "../../constants";
import type { FiltrosEstruturadosProcessos } from "../../types";

interface Props {
  aplicados: FiltrosEstruturadosProcessos;
  rotuloDe: (chave: keyof FiltrosEstruturadosProcessos, valor: string) => string;
  onRemover: (chave: keyof FiltrosEstruturadosProcessos) => void;
}

/** Os filtros ativos, cada um com seu × de remoção.
 *
 * Existe porque o painel fecha ao aplicar: sem os chips, a pessoa não teria
 * como saber que a lista está filtrada nem como desfazer sem reabrir o
 * painel. O rótulo mostra o NOME (cliente, fase), não o id. */
export default function ChipsFiltros({ aplicados, rotuloDe, onRemover }: Props) {
  const chaves = (Object.keys(aplicados) as (keyof FiltrosEstruturadosProcessos)[]).filter(
    (chave) => aplicados[chave],
  );
  if (chaves.length === 0) return null;

  return (
    <div className="chips-row">
      {chaves.map((chave) => (
        <span className="chip" key={chave}>
          {LABEL_FILTRO_PROCESSOS[chave]}: {rotuloDe(chave, aplicados[chave])}
          <button
            type="button"
            aria-label={`Remover filtro ${LABEL_FILTRO_PROCESSOS[chave]}`}
            onClick={() => onRemover(chave)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
