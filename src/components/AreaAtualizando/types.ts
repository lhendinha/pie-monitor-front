import type { ReactNode } from "react";

export interface AreaAtualizandoProps {
  /** Os dados na tela são os ANTERIORES, e os novos estão vindo. */
  atualizando: boolean;
  children: ReactNode;
}
