import { Box, Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../BotaoNu";
import EtiquetasDeSubgrupo from "../../../../EtiquetasDeSubgrupo";
import { formatarDataHora } from "../../../../../utils";
import { detalheSecundario, frasePrincipal } from "../../../../../utils/notificacao";
import type { LinhaDeNotificacaoProps } from "./types";

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
  subgrupoNome,
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
        {/* 🔴 Junto da data, que é a linha de metadados desta linha. O sino
            avisa sobre tudo que acontece nos seus subgrupos, misturado -- e
            "Fulano atribuiu uma tarefa a você" não diz de onde ela vem.

            ⚠️ Fora do `Text` da data, e não dentro: aquele é `fontFamily
            mono` e a etiqueta tem tipografia própria. Herdar mono deixaria a
            etiqueta diferente das outras seis telas. */}
        <Flex align="center" gap="7px" mt="3px" minW="0">
          <Text fontSize="11px" color="fg.subtle" fontFamily="mono">
            {formatarDataHora(notificacao.criado_em)}
          </Text>
          <EtiquetasDeSubgrupo nomes={[subgrupoNome(notificacao.subgrupo_id)]} />
        </Flex>
      </Box>
    </BotaoNu>
  );
}
