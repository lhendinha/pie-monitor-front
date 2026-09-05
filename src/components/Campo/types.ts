import type { ReactNode } from "react";

export interface CampoProps {
  rotulo: string;
  /** `id` do controle que o rótulo nomeia. Obrigatório: rótulo sem `for`
   * não é lido junto do campo, e clicar nele não foca nada.
   *
   * Controle que não aceita `id` num elemento focável (o `SeletorData`, por
   * exemplo, precisa deixar o `id` gerado pela lib intacto no gatilho) se
   * liga pelo caminho inverso: este rótulo também publica um
   * `id="{para}-rotulo"` pra ser apontado por `aria-labelledby`. */
  para: string;
  obrigatorio?: boolean;
  /** Texto de apoio embaixo (`.field-hint`). */
  dica?: ReactNode;
  /** Mensagem de erro. Substitui a dica enquanto existir -- as duas juntas
   * competiriam pela mesma linha, e o erro é o que importa naquele
   * momento. */
  erro?: string;
  /** Conteúdo ao LADO do rótulo -- hoje só o "i" de `DicaDeCampo`.
   *
   * 🔴 Fora do `<label>`, e não dentro. Clicar num `<label htmlFor>` foca o
   * controle que ele nomeia; um botão ali dentro herdaria esse gesto, e o
   * balão abriria e fecharia no mesmo clique. Como irmão, o "i" é só um
   * botão. */
  aposORotulo?: ReactNode;
  children: ReactNode;
}
