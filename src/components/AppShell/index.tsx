import { Box, Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

import MenuLateral from "./MenuLateral";
import Topbar from "./Topbar";

interface Props {
  onSair: () => void;
}

/** Moldura do app autenticado: faixa da marca, menu lateral e a área de
 * conteúdo, que o router preenche via `<Outlet />`.
 *
 * ⚠️ Durante a Fase 2 as telas ainda vêm do `index.css`, então o conteúdo
 * abaixo mistura Chakra (a moldura) com as classes antigas (o miolo). É
 * temporário e esperado: a moldura sobe primeiro justamente pra que cada
 * tela possa ser migrada uma por vez sem quebrar as outras.
 */
export default function AppShell({ onSair }: Props) {
  return (
    <>
      <Box
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
          <Box as="main" flex="1" px="28px" py="24px">
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </>
  );
}
