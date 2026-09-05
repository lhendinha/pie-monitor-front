import type { ReactNode } from "react";

export interface FaixaProps {
  tom: "ok" | "aviso";
  /** Alinha à esquerda quando o texto é uma frase, e não um selo. */
  aEsquerda?: boolean;
  children: ReactNode;
}
