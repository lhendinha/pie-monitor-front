import type { ColunaDoQuadro } from "../../../../types";

export interface ModalDoQuadroProps {
  subgrupoId: string;
  subgrupoNome: string;
  colunas: ColunaDoQuadro[];
  onFechar: () => void;
}
