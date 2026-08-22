import { Botao, EstadoVazio, Tabela } from "../../../../components";
import { COLUNAS_PROCESSOS } from "../../constants/processos";
import LinhaProcesso from "../LinhaProcesso";
import type { Processo } from "../../../../types";

interface Props {
  processos: Processo[];
  filtroAtivo: boolean;
  onLimparFiltros: () => void;
  subgrupoNome: (id: string) => string;
  clientesNomes: (p: Processo) => string;
  faseRotulo: (id?: string | null) => string;
  situacaoRotulo: (id?: string | null) => string;
  onAbrir: (p: Processo) => void;
}

/** A tabela de processos, nas 6 colunas do artifact. */
export default function TabelaProcessos({
  processos,
  filtroAtivo,
  onLimparFiltros,
  subgrupoNome,
  clientesNomes,
  faseRotulo,
  situacaoRotulo,
  onAbrir,
}: Props) {
  return (
    <Tabela
      colunas={COLUNAS_PROCESSOS}
      vazio={
        processos.length === 0 && (
          <EstadoVazio
            /* Vazio por filtro é diferente de vazio de verdade: sem
               distinguir, a pessoa acha que não cadastrou nada. */
            mensagem={
              filtroAtivo
                ? "Nenhum processo com os filtros atuais."
                : "Nenhum processo cadastrado ainda."
            }
            acao={
              filtroAtivo && (
                <Botao variante="ghost" onClick={onLimparFiltros}>
                  Limpar filtros
                </Botao>
              )
            }
          />
        )
      }
    >
      {processos.map((p) => (
        <LinhaProcesso
          key={`${p.subgrupo_id}-${p.numero_processo}`}
          processo={p}
          subgrupoNome={subgrupoNome}
          clientesNomes={clientesNomes}
          faseRotulo={faseRotulo}
          situacaoRotulo={situacaoRotulo}
          onAbrir={onAbrir}
        />
      ))}
    </Tabela>
  );
}
