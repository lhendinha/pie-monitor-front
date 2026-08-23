import { Flex } from "@chakra-ui/react";

import MenuUsuario from "../MenuUsuario";
import SinoDeNotificacoes from "./SinoDeNotificacoes";

interface TopbarProps {
  onSair: () => void;
}

/** Barra superior da área autenticada (`.topbar` do artifact): 60px de
 * altura, divisória de 1px embaixo e as ações encostadas à direita.
 *
 * `sticky top 3px` pra ficar logo abaixo da faixa da marca, que é fixa.
 */
export default function Topbar({ onSair }: TopbarProps) {
  return (
    <Flex
      as="header"
      align="center"
      gap="16px"
      h="60px"
      flex="0 0 auto"
      px="24px"
      bg="bg.surface"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderBottomColor="border"
      position="sticky"
      top="3px"
      zIndex="20"
    >
      <Flex align="center" gap="6px" ml="auto">
        <SinoDeNotificacoes />
        <MenuUsuario onSair={onSair} />
      </Flex>
    </Flex>
  );
}
