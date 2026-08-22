import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Ações à direita, tipicamente o botão de criar. */
  acoes?: ReactNode;
}

/** Título e subtítulo de uma tela (`.page-head` do artifact): 23px/800 com
 * a explicação de uma linha embaixo. */
export default function CabecalhoDePagina({ titulo, subtitulo, acoes }: Props) {
  return (
    <Flex align="flex-start" justify="space-between" gap="16px" mb="20px">
      <Box>
        <Heading
          as="h1"
          fontSize="23px"
          fontWeight="800"
          letterSpacing="-0.01em"
          /* A altura de linha do corpo, e não a do `Heading` do Chakra
             (1.33): são 4px de diferença que empurram tudo que vem
             embaixo -- as abas da tela de Grupo desciam 7px sozinhas. */
          lineHeight="1.45"
        >
          {titulo}
        </Heading>
        {subtitulo && (
          <Text fontSize="13px" color="fg.muted" mt="4px">
            {subtitulo}
          </Text>
        )}
      </Box>
      {acoes && <Box flexShrink={0}>{acoes}</Box>}
    </Flex>
  );
}
