import { Table } from "@chakra-ui/react";
import type { ReactNode } from "react";

/** Uma célula das tabelas do catálogo, com o padding do molde de Clientes.
 *
 * ⚠️ Existe para os três não repetirem `p="13px 14px"` e a divisória em
 * cada célula -- é o tipo de medida que diverge no primeiro ajuste quando
 * está escrita em nove lugares.
 */
export default function Celula({ children }: { children: ReactNode }) {
  return (
    <Table.Cell
      verticalAlign="middle"
      p="13px 14px"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
    >
      {children}
    </Table.Cell>
  );
}
