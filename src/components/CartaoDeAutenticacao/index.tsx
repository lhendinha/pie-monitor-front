import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import MarcaArgos from "../MarcaArgos";

interface CartaoDeAutenticacaoProps {
  titulo: string;
  /** Explicação de uma ou duas linhas embaixo do título. */
  subtitulo?: string;
  children: ReactNode;
}

/** A moldura das telas de entrada (`.gate-page` + `.gate-card` do artifact):
 * cartão de 380px centrado na tela, com a marca em cima.
 *
 * Um componente só para as quatro (entrar, recuperar, redefinir, aceitar
 * convite) porque elas SÃO a mesma tela com miolos diferentes -- quatro
 * cópias desta moldura divergiriam no primeiro ajuste, e ela é a primeira
 * coisa que qualquer pessoa vê do sistema.
 */
export default function CartaoDeAutenticacao({ titulo, subtitulo, children }: CartaoDeAutenticacaoProps) {
  return (
    <Flex minH="100vh" align="center" justify="center" p="24px" bg="bg.canvas">
      <Box
        w="100%"
        maxW="380px"
        p="34px 30px"
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border"
        borderRadius="lg"
        boxShadow="md"
      >
        <Flex justify="center" mb="26px">
          <MarcaArgos tamanho="gate" />
        </Flex>

        <Heading as="h1" fontSize="18px" fontWeight="800" textAlign="center" mb="6px">
          {titulo}
        </Heading>
        {subtitulo && (
          <Text fontSize="13px" color="fg.muted" textAlign="center" lineHeight="1.5" mb="20px">
            {subtitulo}
          </Text>
        )}

        {children}
      </Box>
    </Flex>
  );
}
