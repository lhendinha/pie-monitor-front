import type { ReactNode } from "react";

export interface ModalDeAvisoProps {
  titulo: string;
  mensagem: ReactNode;
  /** Os itens que a mensagem anuncia ("... ainda tem:"), um por linha.
   * Lista, e não frase corrida: quatro impedimentos separados por vírgula
   * viram um parágrafo que ninguém conta. */
  itens?: string[];
  /** Recado extra em faixa amarela -- tipicamente o que fazer pra
   * destravar. */
  detalhe?: string;
  onFechar: () => void;
}
