import type { ReactNode } from "react";

export interface AvisoDaImportacaoProps {
  titulo: string;
  /** O corpo -- uma frase que diz o que fazer a seguir, não só o que houve. */
  children: ReactNode;
}
