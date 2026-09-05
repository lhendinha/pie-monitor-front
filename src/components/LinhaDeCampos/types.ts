import type { ReactNode } from "react";

export interface LinhaDeCamposProps {
  /** Colunas da grade, quando os dois campos não merecem o mesmo espaço --
   * "2fr 1fr" dá o dobro ao primeiro. Um endereço de e-mail precisa caber
   * inteiro; um seletor de três itens, não. */
  proporcoes?: string;
  children: ReactNode;
}
