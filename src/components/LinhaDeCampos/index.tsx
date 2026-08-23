import { SimpleGrid } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  /** Colunas da grade, quando os dois campos não merecem o mesmo espaço --
   * "2fr 1fr" dá o dobro ao primeiro. Um endereço de e-mail precisa caber
   * inteiro; um seletor de três itens, não. */
  proporcoes?: string;
  children: ReactNode;
}

/** Dois campos lado a lado (`.field-row` do artifact): grade de 1fr 1fr com
 * 14px de intervalo.
 *
 * Vira uma coluna só abaixo de 640px -- dois campos de data espremidos num
 * celular não são utilizáveis, e o artifact faz o mesmo no seu media query.
 */
export default function LinhaDeCampos({ proporcoes, children }: Props) {
  return (
    <SimpleGrid
      columns={proporcoes ? undefined : { base: 1, sm: 2 }}
      templateColumns={proporcoes ? { base: "1fr", sm: proporcoes } : undefined}
      gap="14px"
    >
      {children}
    </SimpleGrid>
  );
}
