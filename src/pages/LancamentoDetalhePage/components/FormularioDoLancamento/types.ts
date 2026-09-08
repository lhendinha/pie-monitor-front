import type { CatalogoFinanceiro, Lancamento } from "../../../../types";
import type { CamposDoLancamento } from "../../../../types/requisicoes";

export interface FormularioDoLancamentoProps {
  lancamento: Lancamento;
  catalogo?: CatalogoFinanceiro;
  /** O nome do cliente, quando o lançamento é de um -- a resposta traz só o
   * id, e o campo é de leitura. */
  nomeDoCliente: string;
  erro?: string;
  /** Só o que MUDOU, como todo PATCH do projeto.
   *
   * ⚠️ `rateio` viaja junto de `valor_centavos` sempre que um dos dois muda:
   * a soma das parcelas tem de bater com o valor, e o servidor recusa a
   * edição de um rateado que mude o valor sem trazer a divisão nova. */
  onSalvar: (campos: CamposDoLancamento) => void;
}
