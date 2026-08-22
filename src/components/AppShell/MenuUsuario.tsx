import { Box, Menu, Portal, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import { NOME_PAPEL } from "../../constants";
import { getApelido, getEmail, getPapel } from "../../services";
import { iniciais } from "../../utils";
import { BotaoNu } from "../BotaoNu";


interface Props {
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
export default function MenuUsuario({ onSair }: Props) {
  const navegar = useNavigate();
  const nome = getApelido() || getEmail() || "";
  const papel = getPapel();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <BotaoNu
          type="button"
          display="flex"
          alignItems="center"
          gap="8px"
          px="8px"
          py="6px"
          borderRadius="md"
          cursor="pointer"
          _hover={{ bg: "border.subtle" }}
          _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "2px" }}
        >
          <Box
            w="26px"
            h="26px"
            borderRadius="full"
            bg="bg.brand.subtle"
            color="fg.brand"
            fontSize="11px"
            fontWeight="800"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {iniciais(nome)}
          </Box>
          <Box textAlign="left" display={{ base: "none", md: "block" }}>
            <Text fontSize="13px" fontWeight="600" lineClamp={1}>
              {nome}
            </Text>
            <Text fontSize="11px" color="fg.subtle">
              {(papel && NOME_PAPEL[papel]) || papel}
            </Text>
          </Box>
          <Box aria-hidden="true" color="fg.subtle" fontSize="10px">
            ▾
          </Box>
        </BotaoNu>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="180px">
            <Menu.Item value="perfil" onSelect={() => navegar("/perfil")}>
              Meu perfil
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item value="sair" color="status.bad" onSelect={onSair}>
              Sair
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
