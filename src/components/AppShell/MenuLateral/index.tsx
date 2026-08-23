import { Box, Stack } from "@chakra-ui/react";

import { ITENS_NAVEGACAO } from "../../../constants";
import { papelAtende } from "../../../services";
import BotaoDeSuporte from "../BotaoDeSuporte";
import ItemMenu from "../ItemMenu";
import MarcaArgos from "../MarcaArgos";

/** Menu lateral fixo: marca, navegação e o pé com o Suporte.
 *
 * Quem está logado e o "Sair" ficam no menu do usuário, na topbar -- o
 * rodapé daqui já foi a casa deles na Fase 0, quando ainda não havia
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
      borderColor="border"
      position="sticky"
      /* Logo abaixo da faixa de 3px da marca, que é fixa -- é o
         `top: 3px; height: calc(100vh - 3px)` do artifact. Sem isso a barra
         lateral passa por baixo da faixa e a divisória dela não encosta no
         topo. */
      top="3px"
      h="calc(100vh - 3px)"
      display="flex"
      flexDirection="column"
    >
      <MarcaArgos />

      <Stack as="nav" aria-label="Navegação principal" gap="0" flex="1" overflowY="auto" p="6px 12px">
        {itens.map((item) => (
          <ItemMenu key={item.caminho} item={item} />
        ))}
      </Stack>

      {/* `.sidebar-foot` do artifact: separado da navegação por uma
          divisória, porque Suporte não é uma tela do sistema -- é uma saída
          dele. */}
      <Box p="14px 12px 18px" borderTopWidth="1px" borderTopColor="border.subtle">
        <BotaoDeSuporte />
      </Box>
    </Box>
  );
}
