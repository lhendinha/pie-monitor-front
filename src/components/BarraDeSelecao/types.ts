import type { EstadoDaCaixa } from "../../types";

export interface BarraDeSelecaoProps {
  /** Quantas estão marcadas, e de quantas -- vira "3 de 47 selecionadas". */
  marcadas: number;
  total: number;
  /** O estado da caixa do topo: o traço quando é seleção parcial. */
  estadoDaCaixa: EstadoDaCaixa;
  /** Quantas das marcadas ainda prendem um processo. Zero apaga a faixa. */
  vinculadas: number;
  /** Marca ou desmarca o que a caixa do topo alcança (a página, ou a lista). */
  onAlternarTopo: () => void;
  /** "Selecionar todas as N" / "Limpar seleção".
   *
   * ⚠️ Pode ir ao servidor: a lista tem N, a tela tem uma página. */
  onTodas: () => void;
  /** As N estão a caminho. O link diz isso em vez de parecer travado. */
  carregandoTodas?: boolean;
  /** Uma linha sobre o que o modo CUSTA nesta tela, quando custa algo.
   *
   * 🔴 Nasceu no Kanban, onde a seleção desliga o arraste -- o gesto
   * principal daquela tela. Sem a frase, a pessoa descobre tentando arrastar
   * e concluindo que o quadro travou. Nas telas em que a seleção não tira
   * nada, fica de fora: nota que aparece sempre deixa de ser lida. */
  nota?: string;
  onCancelar: () => void;
  onExcluir: () => void;
  excluindo?: boolean;
}
