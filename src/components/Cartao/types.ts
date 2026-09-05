import type { ReactNode } from "react";

export interface CartaoProps {
  /** Sem título, o cartão não desenha cabeçalho -- é o caso do formulário
   * de detalhe, que é só corpo. */
  titulo?: string;
  acoes?: ReactNode;
  children: ReactNode;
}
