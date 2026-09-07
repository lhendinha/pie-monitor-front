import type { ReactNode } from "react";

export interface SubcabecalhoDaListaProps {
  titulo: string;
  /** A linha de contagem embaixo do título ("Mostrando 3 de 3 contas"). */
  contagem: string;
  /** O botão à direita. Centros de custo não tem: ele nasce inline. */
  acao?: ReactNode;
}
