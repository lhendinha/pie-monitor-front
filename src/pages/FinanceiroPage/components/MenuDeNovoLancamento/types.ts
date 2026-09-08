import type { TomDoPonto } from "../../../../types";
import type { FormaDeLancamento } from "../../types";

export interface MenuDeNovoLancamentoProps {
  onEscolher: (forma: FormaDeLancamento) => void;
}

/** Uma linha do menu: o que ela abre, como se chama e o que é. */
export interface OpcaoDeNovoLancamento {
  forma: FormaDeLancamento;
  rotulo: string;
  descricao: string;
  tom: TomDoPonto;
}
