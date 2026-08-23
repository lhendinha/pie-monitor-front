import { Link, Text } from "@chakra-ui/react";

import { getApelido, getEmail } from "../../../services";
import { montarLinkDeSuporte } from "../../../utils";
import { IconeSuporte } from "../../Icons";

/** "Suporte" no pé do menu lateral.
 *
 * É um `<a href="mailto:">` e não um botão com `window.location`: assim
 * abre no cliente de e-mail que a pessoa já usa, funciona com "abrir em
 * nova aba" e o navegador mostra pra onde vai antes do clique.
 *
 * Desenhado como item de menu (`.sidebar-foot .nav-item` do artifact), só
 * que nunca fica ativo -- não é uma tela do sistema, é uma saída dele.
 */
export default function BotaoDeSuporte() {
  const href = montarLinkDeSuporte({ apelido: getApelido(), email: getEmail() });

  return (
    <Link
      href={href}
      display="flex"
      alignItems="center"
      gap="11px"
      p="9px 10px"
      borderRadius="sm"
      color="fg.muted"
      fontWeight="600"
      _hover={{ bg: "border.subtle", color: "fg", textDecoration: "none" }}
    >
      <IconeSuporte />
      <Text fontSize="13px">Suporte</Text>
    </Link>
  );
}
