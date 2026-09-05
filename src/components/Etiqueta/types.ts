import type { ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

export interface EtiquetaProps {
  /** Fundo e texto -- vêm de fora porque o significado da cor é de quem
   * usa: papel, status de envio, o que for.
   *
   * ⚠️ `borderColor` é OPCIONAL e sem ela não há borda nenhuma: o artifact
   * declara `.etq { border: 1px solid transparent }` e só as variantes que
   * precisam a pintam (`.etq-neutra`, `.etq-info`). Torná-la obrigatória
   * mudaria a altura de todas as pílulas que já existem em 2px. */
  cores: Pick<ButtonProps, "bg" | "color" | "borderColor">;
  children: ReactNode;
}
