import { Box, HStack, Text } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";

import type { ItemNavegacao } from "../../../constants";
import { ICONES_MENU } from "../icones";

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
        /* `.nav-item` do artifact: 9px 10px, gap 11, 13.5px/600. O ativo
           ganha, além do fundo, uma barra de 3px encostada na borda da
           barra lateral -- é o `::before` de lá, em `left: -12px`, que só
           funciona porque a lista tem 12px de padding. */
        <HStack
          position="relative"
          gap="11px"
          p="9px 10px"
          mb="2px"
          borderRadius="sm"
          color={isActive ? "brand.darker" : "fg.muted"}
          bg={isActive ? "bg.brand.subtle" : "transparent"}
          fontWeight="600"
          _hover={{ bg: isActive ? "bg.brand.subtle" : "border.subtle", color: isActive ? "brand.darker" : "fg" }}
          _before={
            isActive
              ? {
                  content: '""',
                  position: "absolute",
                  left: "-12px",
                  top: "6px",
                  bottom: "6px",
                  width: "3px",
                  borderRadius: "2px",
                  bg: "fg.brand",
                }
              : undefined
          }
        >
          {Icone && (
            <Box aria-hidden="true" display="flex" color={isActive ? "fg.brand" : "fg.subtle"}>
              <Icone />
            </Box>
          )}
          <Text fontSize="13.5px">{item.rotulo}</Text>
        </HStack>
      )}
    </NavLink>
  );
}
