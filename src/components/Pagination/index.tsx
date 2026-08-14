import { TAMANHOS_PAGINA } from "../../types";

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  tamanhoPagina: number;
  onMudarPagina: (pagina: number) => void;
  onMudarTamanho: (tamanho: number) => void;
}

/** Monta a lista de números visíveis com reticências pra listas longas --
 * sempre mostra primeira, última, e as vizinhas da página atual. */
function numerosVisiveis(pagina: number, totalPaginas: number): (number | "...")[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }
  const candidatos = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1]);
  const ordenados = [...candidatos].filter((n) => n >= 1 && n <= totalPaginas).sort((a, b) => a - b);
  const resultado: (number | "...")[] = [];
  let anterior = 0;
  for (const n of ordenados) {
    if (anterior && n - anterior > 1) resultado.push("...");
    resultado.push(n);
    anterior = n;
  }
  return resultado;
}

/** Paginação real -- cada número é endereçável direto (o backend faz Query
 * por intervalo de sequência, não cursor sequencial), então dá pra pular
 * pra qualquer página sem ter visitado as anteriores. */
export default function Pagination({ pagina, totalPaginas, tamanhoPagina, onMudarPagina, onMudarTamanho }: PaginationProps) {
  return (
    <div className="pagination">
      {totalPaginas > 1 && (
        <div className="pagination-nav">
          <button
            className="pagination-seta"
            type="button"
            disabled={pagina <= 1}
            onClick={() => onMudarPagina(pagina - 1)}
            title="Página anterior"
          >
            ‹
          </button>
          <div className="pagination-numeros">
            {numerosVisiveis(pagina, totalPaginas).map((n, i) =>
              n === "..." ? (
                <span className="pagination-reticencias" key={`reticencias-${i}`}>
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`pagination-numero${n === pagina ? " active" : ""}`}
                  onClick={() => onMudarPagina(n)}
                >
                  {n}
                </button>
              )
            )}
          </div>
          <button
            className="pagination-seta"
            type="button"
            disabled={pagina >= totalPaginas}
            onClick={() => onMudarPagina(pagina + 1)}
            title="Próxima página"
          >
            ›
          </button>
        </div>
      )}
      <div className="pagination-tamanho">
        <label htmlFor="tamanho-pagina">Por página</label>
        <select
          id="tamanho-pagina"
          value={tamanhoPagina}
          onChange={(e) => onMudarTamanho(Number(e.target.value))}
        >
          {TAMANHOS_PAGINA.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
