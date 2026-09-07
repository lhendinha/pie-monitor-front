import { CartaoDeTabela } from "../../../../components";
import LinhaDoCatalogo from "../LinhaDoCatalogo";
import type { ListaDeCentrosProps } from "./types";

/** Recorte gerencial, transversal às categorias -- Cível, Trabalhista.
 *
 * ⚠️ É o único dos três sem modal: centro de custo é só um nome, e um modal
 * para um campo só é uma janela a mais entre a pessoa e o que ela quer.
 * Nasce inline, no topo da lista.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeCentros({ centros, podeEscrever }: ListaDeCentrosProps) {
  return (
    <CartaoDeTabela>
      {centros.map((centro) => (
        <LinhaDoCatalogo
          key={centro.centro_id}
          nome={centro.nome}
          ativo={centro.ativo}
          detalhe={centro.ativo ? "" : "(Inativo)"}
          onEditar={podeEscrever ? () => undefined : undefined}
          onAlternarAtivo={podeEscrever ? () => undefined : undefined}
        />
      ))}
    </CartaoDeTabela>
  );
}
