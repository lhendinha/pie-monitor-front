import type { ProcessoEncontrado } from "../../../../types";

export interface LinhaDaPreviaProps {
  processo: ProcessoEncontrado;
  marcado: boolean;
  onAlternar: () => void;
}
