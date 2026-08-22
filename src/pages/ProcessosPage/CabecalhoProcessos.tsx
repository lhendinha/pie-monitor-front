import { InfoTip } from "../../components";

interface Props {
  carregando: boolean;
  total: number;
  filtroAtivo: boolean;
  busca: string;
  onBuscar: (valor: string) => void;
  quantidadeFiltros: number;
  onAlternarPainel: () => void;
  onNovoProcesso: () => void;
}

/** Título, contador, botão de novo processo e a linha de busca.
 *
 * O contador muda de palavra conforme o estado: com filtro é "resultado",
 * sem filtro é "ativo". São coisas diferentes -- 3 resultados de uma busca
 * não querem dizer 3 processos ativos no escritório.
 */
export default function CabecalhoProcessos({
  carregando,
  total,
  filtroAtivo,
  busca,
  onBuscar,
  quantidadeFiltros,
  onAlternarPainel,
  onNovoProcesso,
}: Props) {
  const contagem = carregando
    ? "carregando…"
    : filtroAtivo
      ? `${total} resultado(s)`
      : `${total} ativo(s)`;

  return (
    <>
      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Processos monitorados</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="section-count">{contagem}</span>
          <button className="btn" type="button" onClick={onNovoProcesso}>
            + Novo Processo
          </button>
        </div>
      </div>

      <div className="busca-row">
        <div className="field">
          <span className="field-label-row">
            <label htmlFor="busca-processo">Buscar</label>
            <InfoTip>
              Busca pelo número do processo, apelido, objeto/assunto, próxima providência ou
              observações.
            </InfoTip>
          </span>
          <input
            id="busca-processo"
            value={busca}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Número, apelido, assunto, providência ou observações…"
          />
        </div>
        <button
          className={`btn-ghost${quantidadeFiltros > 0 ? " tem-filtro" : ""}`}
          type="button"
          onClick={onAlternarPainel}
        >
          Filtros{quantidadeFiltros > 0 ? ` (${quantidadeFiltros})` : ""}
        </button>
      </div>
    </>
  );
}
