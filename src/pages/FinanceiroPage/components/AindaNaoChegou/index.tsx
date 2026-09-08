import { CartaoDeTabela, EstadoVazio } from "../../../../components";
import type { AindaNaoChegouProps } from "./types";

/** A aba que existe na barra e ainda não tem conteúdo.
 *
 * 🔴 Ela APARECE mesmo vazia: as quatro abas são a estrutura da tela, e
 * escondê-las faria `/financeiro` parecer ser só uma tela de configuração.
 * Clicar e não acontecer nada é que seria ruim -- por isso a frase.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function AindaNaoChegou({ rotulo }: AindaNaoChegouProps) {
  return (
    <CartaoDeTabela>
      <EstadoVazio mensagem={`${rotulo} ainda não está disponível.`} />
    </CartaoDeTabela>
  );
}
