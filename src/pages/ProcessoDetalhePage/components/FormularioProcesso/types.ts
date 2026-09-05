import type { Processo } from "../../../../types";

export interface FormularioProcessoProps {
  processo: Processo;
  subgrupoNome: string;
  faseRotulo: string;
  situacaoRotulo: string;
  onSalvo: () => void;
  onRemover: () => void;
}
