import type { ClienteAFaturar } from "../../../../types";

export interface ModalDeEmissaoProps {
  cliente: ClienteAFaturar;
  onFechar: () => void;
  /** A emissão deu certo -- quem chama leva para o documento. */
  onEmitida: (faturaId: string) => void;
}
