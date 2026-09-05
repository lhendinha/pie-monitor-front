import type { ReactNode } from "react";

export interface CabecalhoDePaginaProps {
  titulo: string;
  subtitulo?: string;
  /** Ações à direita, tipicamente o botão de criar. */
  acoes?: ReactNode;
}
