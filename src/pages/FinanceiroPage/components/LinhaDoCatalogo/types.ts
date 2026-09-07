import type { ReactNode } from "react";

export interface LinhaDoCatalogoProps {
  /** As células da linha, na ordem das colunas -- sem a de ações, que este
   * componente monta. */
  children: ReactNode;
  /** O nome em TEXTO, para os `aria-label` das ações e do clique. */
  nome: string;
  ativo: boolean;
  /** O clique na LINHA: abre o modal na categoria e na conta, começa o
   * rename no centro. Ausente para quem não pode escrever -- e aí a linha
   * deixa de ser clicável. */
  onAbrir?: () => void;
  /** Ausente quando quem olha não pode escrever. */
  onAlternarAtivo?: () => void;
  /** Trava só ESTA linha enquanto a chamada dela corre. */
  ocupada?: boolean;
}
