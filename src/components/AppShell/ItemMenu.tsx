import { Box, HStack, Text } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";

import type { ItemNavegacao } from "../../constants";
import { ICONES_MENU } from "./icones";

interface Props {
  item: ItemNavegacao;
}

/** Um item do menu lateral.
 *
 * `NavLink` com `end` na raiz: sem `end`, o caminho `/` casaria com **todas**
 * as rotas (`/kanban`, `/processos`…) e a Área de trabalho ficaria marcada
 * como ativa o tempo todo.
 *
 * O estado ativo é derivado no render, a partir do `isActive` que o router
 * entrega -- não guardado em estado próprio, que é como esse tipo de menu
 * costuma dessincronizar do endereço.
 */
export default function ItemMenu({ item }: Props) {
  const Icone = ICONES_MENU[item.icone];

  return (
    <NavLink to={item.caminho} end={item.caminho === "/"} style={{ display: "block" }}>
      {({ isActive }) => (
        <HStack
          gap="10px"
          px="12px"
          py="9px"
          mx="10px"
          borderRadius="md"
          color={isActive ? "fg.brand" : "fg.muted"}
          bg={isActive ? "bg.brand.subtle" : "transparent"}
          fontWeight={isActive ? "700" : "500"}
          _hover={{ bg: isActive ? "bg.brand.subtle" : "border.subtle" }}
        >
          {Icone && (
            <Box aria-hidden="true" display="flex">
              <Icone />
            </Box>
          )}
          <Text fontSize="13.5px">{item.rotulo}</Text>
        </HStack>
      )}
    </NavLink>
  );
}
