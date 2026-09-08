import { Box, Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

import MenuLateral from "./MenuLateral";
import Topbar from "./Topbar";
import type { AppShellProps } from "./types";

/** Moldura do app autenticado: faixa da marca, menu lateral e a área de
 * conteúdo, que o router preenche via `<Outlet />`.
 *
 * ⚠️ **A moldura leva `data-fora-da-impressao`** -- a faixa aqui, e o menu e
 * a barra do topo cada um na PRÓPRIA raiz. Envolvê-los num `Box` aqui seria
 * mais curto e estaria errado: os dois são filhos diretos do flex (`flex: 0
 * 0 236px` no menu), e o invólucro passaria a ser o filho, deslocando o
 * menu. Quem imprime uma tela do Argos quer o documento, não a moldura; a
 * regra que a esconde é uma só, no `@media print` do tema.
 */
export default function AppShell({ onSair }: AppShellProps) {
  return (
    <>
      <Box
        data-fora-da-impressao
        position="fixed"
        top="0"
        left="0"
        right="0"
        h="3px"
        zIndex="40"
        bgGradient="to-r"
        gradientFrom="brand"
        gradientTo="brand.darker"
      />
      <Flex minH="100vh" pt="3px" bg="bg.canvas">
        <MenuLateral />
        <Box flex="1" minW="0" display="flex" flexDirection="column">
          <Topbar onSair={onSair} />
          {/* `.content` do artifact: 26px 32px 60px, centralizado e com
              teto de 1400px -- em tela larga o conteúdo para de esticar em
              vez de acompanhar o monitor. */}
          <Box as="main" flex="1" w="100%" maxW="1400px" mx="auto" p="26px 32px 60px">
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </>
  );
}
