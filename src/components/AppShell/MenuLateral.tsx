import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";

import { ITENS_NAVEGACAO, NOME_PAPEL } from "../../constants";
import { getApelido, getEmail, getPapel, papelAtende } from "../../services";
import ItemMenu from "./ItemMenu";

interface Props {
  onSair: () => void;
}

/** Menu lateral fixo: marca, navegação e o rodapé com quem está logado. */
export default function MenuLateral({ onSair }: Props) {
  const itens = ITENS_NAVEGACAO.filter(
    (i) => !i.pendente && (!i.minimo || papelAtende(i.minimo)),
  );
  const papel = getPapel();

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

      <Box borderTopWidth="1px" borderColor="border.subtle" px="20px" py="14px">
        <Text fontSize="13px" fontWeight="600" lineClamp={1}>
          {getApelido() || getEmail()}
        </Text>
        <Text fontSize="12px" color="fg.subtle" mb="8px">
          {(papel && NOME_PAPEL[papel]) || papel}
        </Text>
        <Button size="xs" variant="outline" onClick={onSair}>
          Sair
        </Button>
      </Box>
    </Box>
  );
}
