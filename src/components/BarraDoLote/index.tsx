import BarraDeSelecao from "../BarraDeSelecao";
import { chaveDe, contarVinculadas, estadoDaCaixaDoTopo } from "../../utils";
import type { BarraDoLoteProps } from "./types";

/** A `BarraDeSelecao` ligada à seleção, para quem tem o universo INTEIRO em
 * mãos: a Agenda (o período já baixado) e o Kanban (o quadro inteiro).
 *
 * 🔴 A Área de trabalho NÃO usa esta: lá a lista é paginada, "todas as N" vai
 * ao servidor e a caixa do topo alcança só a página -- três contas
 * diferentes, e é por isso que `useAcoesEmLote` diz no seu docstring que não
 * monta a barra. Aqui as três contas saem do mesmo `universo`, e um
 * componente só evita que as duas telas divirjam na primeira mudança.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 5.
 */
export default function BarraDoLote({ selecao, universo, nota, onExcluir, excluindo }: BarraDoLoteProps) {
  const marcadas = universo.filter(selecao.estaMarcada);
  const chaves = universo.map(chaveDe);

  return (
    <BarraDeSelecao
      marcadas={selecao.marcadas.size}
      total={universo.length}
      estadoDaCaixa={estadoDaCaixaDoTopo(marcadas.length, universo.length)}
      vinculadas={contarVinculadas(marcadas)}
      nota={nota}
      onAlternarTopo={() => selecao.alternarTodas(chaves)}
      onTodas={() =>
        selecao.marcadas.size >= universo.length ? selecao.limpar() : selecao.alternarTodas(chaves)
      }
      onCancelar={selecao.sair}
      /* O que vai ao lote é o MESMO conjunto que a faixa contou -- a barra
         não pode avisar sobre um recorte e apagar outro. */
      onExcluir={() => onExcluir(marcadas)}
      excluindo={excluindo}
    />
  );
}
