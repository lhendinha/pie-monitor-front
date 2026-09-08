import type { ReactNode } from "react";

import type { Lancamento } from "../../../../types";

export interface LinhaDeVencimentoProps {
  lancamento: Lancamento;
  /** O botão redondo de dar baixa, montado por quem chama -- como a ação da
   * linha de tarefa. */
  acao?: ReactNode;
}
