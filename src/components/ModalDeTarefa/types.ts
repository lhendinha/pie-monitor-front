import type { Tarefa, Vinculo } from "../../types";

/** As props de `ModalDeTarefa` que o formulário usa -- todas menos o nome
 * do subgrupo, que só a tela mostra. A explicação de cada uma está lá. */
export interface OpcoesDoFormularioDeTarefa {
  tarefa?: Tarefa | null;
  subgrupoAtual: string;
  colunaInicial?: string;
  vinculoInicial?: Vinculo | null;
  dataInicial?: string;
  onSalvo: () => void;
  onFechar: () => void;
}
