import { Flex } from "@chakra-ui/react";

import MenuUsuario from "./MenuUsuario";

interface Props {
  onSair: () => void;
}

/** Barra superior da área autenticada. Hoje só carrega o menu do usuário --
 * notificações e busca global do artifact ficam pra quando existirem de
 * verdade no backend, em vez de virarem botão que não faz nada. */
export default function Topbar({ onSair }: Props) {
  return (
    <Flex
      as="header"
      justify="flex-end"
      align="center"
      px="28px"
      py="10px"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
    >
      <MenuUsuario onSair={onSair} />
    </Flex>
  );
}
