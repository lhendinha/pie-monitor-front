import type { CentroDeCusto } from "../../../../types";

export interface ListaDeCentrosProps {
  centros: CentroDeCusto[];
  podeEscrever: boolean;
  onNovo: () => void;
  onEditar: (centro: CentroDeCusto) => void;
  onAlternarAtivo: (centro: CentroDeCusto) => void;
}
