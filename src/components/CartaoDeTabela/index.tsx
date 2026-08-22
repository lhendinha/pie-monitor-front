import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/** O cartão que envolve uma tabela (`.table-card` do artifact).
 *
 * A paginação e o estado vazio vivem DENTRO dele, não embaixo: no artifact
 * o cartão fecha depois da paginação, e é isso que faz a barra de páginas
 * parecer parte da tabela em vez de um bloco solto na página.
 *
 * Medidas do artifact: raio `lg`, borda de 1px em `line`, sombra `sm` e
 * padding 6px 4px -- pequeno de propósito, porque quem espaça de verdade
 * são as células.
 */
export default function CartaoDeTabela({ children }: Props) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border"
      borderRadius="lg"
      boxShadow="sm"
      px="4px"
      py="6px"
    >
      {children}
    </Box>
  );
}
