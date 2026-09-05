import type { ReactNode } from "react";

export interface DicaDeCampoProps {
  /** O que o botão anuncia para leitor de tela. Não é o texto da dica: é a
   * pergunta que ela responde ("Por que o nome completo importa"). */
  rotulo: string;
  children: ReactNode;
}
