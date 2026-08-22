import { Box, HStack, Stack, Text } from "@chakra-ui/react";

import { ITENS_NAVEGACAO } from "../../constants";
import { papelAtende } from "../../services";
import ItemMenu from "./ItemMenu";

/** Menu lateral fixo: marca e navegação.
 *
 * Quem está logado e o "Sair" ficam no menu do usuário, na topbar -- o
 * rodapé daqui era solução provisória da Fase 0, quando ainda não havia
 * topbar. Duas portas pra mesma ação em telas diferentes é confusão. */
export default function MenuLateral() {
  const itens = ITENS_NAVEGACAO.filter(
    (i) => !i.pendente && (!i.minimo || papelAtende(i.minimo)),
  );

  return (
    <Box
      as="aside"
      w="236px"
      flex="0 0 236px"
      bg="bg.surface"
      borderRightWidth="1px"
      borderColor="border.default"
      position="sticky"
      top="0"
      h="100vh"
      display="flex"
      flexDirection="column"
    >
      <HStack gap="10px" px="20px" pt="20px" pb="16px">
        <Box w="22px" h="22px" borderRadius="7px" bg="fg.brand" />
        <Text fontSize="17px" fontWeight="800" letterSpacing="-0.01em">
          Argos
        </Text>
      </HStack>

      <Stack as="nav" aria-label="Navegação principal" gap="2px" flex="1" overflowY="auto">
        {itens.map((item) => (
          <ItemMenu key={item.caminho} item={item} />
        ))}
      </Stack>

    </Box>
  );
}
