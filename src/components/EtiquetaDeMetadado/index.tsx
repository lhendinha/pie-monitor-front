import { Flex } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface EtiquetaDeMetadadoProps {
  children: ReactNode;
}

/** Etiqueta de metadado (`.meta-chip` do artifact): pílula discreta em cima
 * do fundo da página, usada para subgrupo, situação e fase no cabeçalho de
 * um detalhe. Não é a pílula de filtro -- esta não é clicável. */
export default function EtiquetaDeMetadado({ children }: EtiquetaDeMetadadoProps) {
  return (
    <Flex
      align="center"
      gap="6px"
      fontSize="12px"
      color="fg.muted"
      bg="bg.canvas"
      borderWidth="1px"
      borderColor="border.subtle"
      p="5px 10px"
      borderRadius="full"
    >
      {children}
    </Flex>
  );
}
