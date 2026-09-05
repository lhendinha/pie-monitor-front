import type { ReactNode } from "react";

export interface BotaoDeIconeProps {
  rotulo: string;
  /** Ponto vermelho de "tem coisa nova", como no artifact. */
  comAviso?: boolean;
  onClick?: () => void;
  children: ReactNode;
}
