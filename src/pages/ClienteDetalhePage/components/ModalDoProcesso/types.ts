import type { Processo } from "../../../../types";

export interface ModalDoProcessoProps {
  processo: Processo;
  /** Rótulo da situação, já resolvido -- a tela é quem tem o catálogo. */
  situacao: string;
  /** Rótulo da fase, idem. */
  fase: string;
  onAbrirProcesso: () => void;
  onFechar: () => void;
}
