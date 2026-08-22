import { Select } from "../../components";
import type { Cliente, FiltrosEstruturadosProcessos, OpcaoProcesso } from "../../types";

interface Props {
  aberto: boolean;
  rascunho: FiltrosEstruturadosProcessos;
  onMudar: (parcial: Partial<FiltrosEstruturadosProcessos>) => void;
  clientes: Cliente[];
  fases: OpcaoProcesso[];
  situacoes: OpcaoProcesso[];
  onAplicar: () => void;
  onLimpar: () => void;
}

/** Painel com os 5 filtros estruturados. Edita só o **rascunho** -- nada
 * daqui dispara busca até "Aplicar filtros" (ver `useFiltrosProcessos`). */
export default function PainelFiltros({
  aberto,
  rascunho,
  onMudar,
  clientes,
  fases,
  situacoes,
  onAplicar,
  onLimpar,
}: Props) {
  return (
    <div className={`filtros-painel${aberto ? " aberto" : ""}`}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="filtro-cliente">Cliente</label>
          <Select
            id="filtro-cliente"
            opcoes={[
              { value: "", label: "Qualquer um" },
              ...clientes.map((c) => ({ value: c.cliente_id, label: c.nome })),
            ]}
            valor={rascunho.clienteId}
            onMudar={(v) => onMudar({ clienteId: v })}
          />
        </div>
        <div className="field">
          <label htmlFor="filtro-fase">Fase atual</label>
          <Select
            id="filtro-fase"
            opcoes={[
              { value: "", label: "Qualquer uma" },
              ...fases.map((f) => ({ value: f.opcao_id, label: f.rotulo })),
            ]}
            valor={rascunho.faseId}
            onMudar={(v) => onMudar({ faseId: v })}
          />
        </div>
        <div className="field">
          <label htmlFor="filtro-situacao">Situação atual</label>
          <Select
            id="filtro-situacao"
            opcoes={[
              { value: "", label: "Qualquer uma" },
              ...situacoes.map((s) => ({ value: s.opcao_id, label: s.rotulo })),
            ]}
            valor={rascunho.situacaoId}
            onMudar={(v) => onMudar({ situacaoId: v })}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="filtro-verificar">Data p/ verificar (até)</label>
          <input
            id="filtro-verificar"
            type="date"
            value={rascunho.dataVerificarAte}
            onChange={(e) => onMudar({ dataVerificarAte: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="filtro-prazo">Prazo final (até)</label>
          <input
            id="filtro-prazo"
            type="date"
            value={rascunho.prazoFinalAte}
            onChange={(e) => onMudar({ prazoFinalAte: e.target.value })}
          />
        </div>
      </div>
      <div className="filtros-painel-acoes">
        <button className="btn-ghost" type="button" onClick={onLimpar}>
          Limpar
        </button>
        <button className="btn" type="button" onClick={onAplicar}>
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}
