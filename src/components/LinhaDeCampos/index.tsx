import { SimpleGrid } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/** Dois campos lado a lado (`.field-row` do artifact): grade de 1fr 1fr com
 * 14px de intervalo.
 *
 * Vira uma coluna só abaixo de 640px -- dois campos de data espremidos num
 * celular não são utilizáveis, e o artifact faz o mesmo no seu media query.
 */
export default function LinhaDeCampos({ children }: Props) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap="14px">
      {children}
    </SimpleGrid>
  );
}
