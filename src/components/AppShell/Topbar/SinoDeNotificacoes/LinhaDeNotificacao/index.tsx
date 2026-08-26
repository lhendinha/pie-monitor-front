import { Box, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../BotaoNu";
import { formatarDataHora } from "../../../../../utils";
import { detalheSecundario, frasePrincipal } from "../../../../../utils/notificacao";
import type { Notificacao } from "../../../../../types";

interface LinhaDeNotificacaoProps {
  notificacao: Notificacao;
  /** Apelido de quem agiu. O aviso guarda só o e-mail, e quem resolve o
   * nome é quem monta a lista. */
  /** `undefined` quando a notificação não leva a lugar nenhum -- e aí a
   * linha não é clicável, em vez de fingir que é. */
  onAbrir?: () => void;
  ultima?: boolean;
}

/** Uma linha do painel do sino.
 *
 * O ponto azul à esquerda marca a NÃO LIDA. É a única diferença visual
 * entre os dois estados, de propósito: o painel é uma lista curta, e
 * esmaecer as lidas tornaria metade dela ilegível.
 */
export default function LinhaDeNotificacao({
  notificacao,
  onAbrir,
  ultima,
}: LinhaDeNotificacaoProps) {
  const clicavel = Boolean(onAbrir);

  return (
    <BotaoNu
      type="button"
      onClick={onAbrir}
      disabled={!clicavel}
      display="flex"
      alignItems="flex-start"
      gap="10px"
      w="100%"
      textAlign="left"
      p="11px 14px"
      cursor={clicavel ? "pointer" : "default"}
      borderBottomWidth={ultima ? "0" : "1px"}
      borderBottomStyle="solid"
      borderBottomColor="border.subtle"
      _hover={clicavel ? { bg: "bg.canvas" } : undefined}
    >
      {/* Ocupa lugar mesmo quando lida, pra que o texto de todas as linhas
          comece na mesma coluna -- sem isso a lista fica serrilhada. */}
      <Box
        w="7px"
        h="7px"
        mt="5px"
        flexShrink="0"
        borderRadius="full"
        bg={notificacao.lida ? "transparent" : "fg.brand"}
      />

      <Box flex="1" minW="0">
        <Text fontSize="13px" fontWeight={notificacao.lida ? "600" : "700"}>
          {frasePrincipal(notificacao)}
        </Text>
        <Text fontSize="12px" color="fg.muted" mt="1px" truncate>
          {detalheSecundario(notificacao)}
        </Text>
        <Text fontSize="11px" color="fg.subtle" mt="3px" fontFamily="mono">
          {formatarDataHora(notificacao.criado_em)}
        </Text>
      </Box>
    </BotaoNu>
  );
}
