import { Box, Menu, Portal, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import { getApelido, getEmail } from "../../../services";
import Avatar from "../../Avatar";
import { BotaoNu } from "../../BotaoNu";
import IconeChevron from "../../Icons/IconeChevron";
import { OPCAO_DE_MENU, PAINEL_DE_MENU } from "../../../theme/menu";


interface MenuUsuarioProps {
  onSair: () => void;
}

/** Chip do usuário na topbar, abrindo menu com "Meu perfil" e "Sair".
 *
 * O artifact tinha o chip com chevron mas ele **só navegava** pro perfil --
 * um chevron prometendo menu que não abria menu. E "Sair" não existia em
 * lugar nenhum do desenho, então não havia como encerrar a sessão.
 *
 * ⚠️ "Sair" chama o `sair` da sessão, que faz `POST /logout` **antes** de
 * limpar o local: só limpar o storage deixaria o refresh token válido no
 * servidor, e a sessão seguiria viva pra quem tivesse o token.
 */
export default function MenuUsuario({ onSair }: MenuUsuarioProps) {
  const navegar = useNavigate();
  const nome = getApelido() || getEmail() || "";

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        {/* `.user-chip` do artifact: avatar de 22px, o nome em 700/13 e a
            seta -- sem a linha do papel, que lá não existe. */}
        <BotaoNu
          type="button"
          display="flex"
          alignItems="center"
          gap="9px"
          p="5px 10px 5px 5px"
          borderRadius="full"
          ml="6px"
          cursor="pointer"
          _hover={{ bg: "border.subtle" }}
          _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "2px" }}
        >
          <Avatar nome={nome} tamanho="pequeno" />
          <Text
            fontSize="13px"
            fontWeight="700"
            lineClamp={1}
            display={{ base: "none", md: "block" }}
          >
            {nome}
          </Text>
          <Box aria-hidden="true" color="fg.subtle" display="flex">
            <IconeChevron tamanho={14} />
          </Box>
        </BotaoNu>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content css={PAINEL_DE_MENU} minW="180px">
            <Menu.Item value="perfil" onSelect={() => navegar("/perfil")} css={OPCAO_DE_MENU}>
              Meu perfil
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item value="sair" onSelect={onSair} css={OPCAO_DE_MENU} color="status.bad">
              Sair
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
