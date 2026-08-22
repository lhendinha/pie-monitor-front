import { Flex } from "@chakra-ui/react";

import IconeSino from "../Icons/IconeSino";
import BotaoDeIcone from "./BotaoDeIcone";
import MenuUsuario from "./MenuUsuario";

interface Props {
  onSair: () => void;
}

/** Barra superior da área autenticada (`.topbar` do artifact): 60px de
 * altura, divisória de 1px embaixo e as ações encostadas à direita.
 *
 * `sticky top 3px` pra ficar logo abaixo da faixa da marca, que é fixa.
 */
export default function Topbar({ onSair }: Props) {
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
        {/* ⚠️ O sino é INERTE de propósito, decidido em 22/08/2026: não
            existe endpoint de notificações ainda, e o artifact traz o botão
            (com o ponto de aviso) no desenho. Não é esquecimento -- quando o
            backend existir, é aqui que o `onClick` entra. */}
        <BotaoDeIcone rotulo="Notificações" comAviso>
          <IconeSino />
        </BotaoDeIcone>
        <MenuUsuario onSair={onSair} />
      </Flex>
    </Flex>
  );
}
