import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { CabecalhoDePaginaProps } from "./types";

/** Título e subtítulo de uma tela (`.page-head` do artifact): 23px/800 com
 * a explicação de uma linha embaixo. */
export default function CabecalhoDePagina({ titulo, subtitulo, acoes }: CabecalhoDePaginaProps) {
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
      {/* `.page-head-actions` do artifact: flex com 8px de intervalo. Era um
          `Box` seco, e com DUAS ações elas ficavam coladas -- só apareceu
          quando o Kanban ganhou o "Editar quadro" ao lado do "Nova
          tarefa". */}
      {acoes && (
        <Flex align="center" gap="8px" flexShrink={0}>
          {acoes}
        </Flex>
      )}
    </Flex>
  );
}
