import type { ReactNode } from "react";

export interface SubcabecalhoDaListaProps {
  titulo: string;
  /** A linha de contagem embaixo do título ("Mostrando 3 de 3 contas"). */
  contagem: string;
  /** O botão à direita. Ausente para quem só lê -- as três listas têm um. */
  acao?: ReactNode;
}
