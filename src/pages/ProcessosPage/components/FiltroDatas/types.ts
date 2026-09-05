import type { DatasDoFiltro } from "../../types";

export interface FiltroDatasProps {
  dataVerificarAte: string;
  prazoFinalAte: string;
  onMudar: (parcial: DatasDoFiltro) => void;
}
