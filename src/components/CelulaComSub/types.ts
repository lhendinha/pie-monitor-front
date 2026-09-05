import type { ReactNode } from "react";

export interface CelulaComSubProps {
  principal: ReactNode;
  sub?: ReactNode;
  /** - `processo`: coluna "Processo", onde a linha de cima é `.proc-num`
   *   (mono, 700, 12.5px) e a de baixo `.cell-sub.mono`. Vale mesmo quando
   *   a linha de cima é o apelido -- é assim no artifact.
   * - `destaque`: a primeira coluna de uma tabela de lista, que o artifact
   *   escreve como `<td style="font-weight:700">`. */
  variante?: "padrao" | "processo" | "destaque";
  /** Largura fixa da coluna -- só pra coluna de controle (a caixa de marcar
   * da prévia da importação), que sem isto ganharia a mesma fatia das
   * colunas de texto. As demais se distribuem pelo conteúdo. */
  largura?: string;
}
