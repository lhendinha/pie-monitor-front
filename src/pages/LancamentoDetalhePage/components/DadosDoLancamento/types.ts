import type { CatalogoFinanceiro, Lancamento } from "../../../../types";

export interface DadosDoLancamentoProps {
  lancamento: Lancamento;
  /** De onde saem os nomes de categoria, conta e centro -- o lançamento traz
   * só os ids. */
  catalogo?: CatalogoFinanceiro;
  /** O nome de cada departamento do rateio, resolvido pela tela. */
  nomeDoDepartamento: (subgrupoId: string) => string;
}
