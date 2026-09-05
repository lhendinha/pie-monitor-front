import type { ReactNode } from "react";

export interface PainelDaAbaProps {
  /** Mesmo `grupo` passado ao `Abas` da mesma página -- é ele que casa o
   * `aria-controls` da aba com o `id` daqui. */
  grupo: string;
  /** O id da aba que comanda este painel. */
  id: string;
  ativa: string;
  children: ReactNode;
}
