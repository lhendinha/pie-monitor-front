import type { ReactNode } from "react";

export interface CartaoDeAutenticacaoProps {
  titulo: string;
  /** Explicação de uma ou duas linhas embaixo do título. */
  subtitulo?: string;
  children: ReactNode;
}
