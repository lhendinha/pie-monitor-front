import type { Vinculo } from "../../types";

export interface EtiquetaDeVinculoProps {
  vinculo: Vinculo;
  onRemover: () => void;
}
