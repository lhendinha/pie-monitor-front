import { Box, Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../BotaoNu";
import Etiqueta from "../../../../Etiqueta";
import EtiquetasDeSubgrupo from "../../../../EtiquetasDeSubgrupo";
import { ESTADO_DO_ALVO_EXCLUIDO, MARCA_DO_ALVO } from "../../../../../constants/notificacoes";
import { formatarDataHora } from "../../../../../utils";
import { detalheSecundario, frasePrincipal } from "../../../../../utils/notificacao";
import type { LinhaDeNotificacaoProps } from "./types";

/** As cores da marca da linha morta -- as duas já conferidas pelo guarda de
 * contraste: a neutra é a da etiqueta de subgrupo, a de aviso é a do status de
 * atendimento em andamento (`STATUS_EM_ANDAMENTO`). A marca de sem acesso pede
 * atenção porque tem remédio; a de excluído, não. */
const CORES_DA_MARCA = {
  neutra: { bg: "border.subtle", color: "fg.muted", borderColor: "border" },
  aviso: { bg: "status.warn.bg", color: "status.warn.text" },
} as const;

/** Uma linha do painel do sino.
 *
 * O ponto azul à esquerda marca a NÃO LIDA. É a única diferença visual
 * entre os dois estados, de propósito: o painel é uma lista curta, e
 * esmaecer as lidas tornaria metade dela ilegível.
 */
export default function LinhaDeNotificacao({
  notificacao,
  onAbrir,
  estadoMorto,
  ultima,
  subgrupoNome,
}: LinhaDeNotificacaoProps) {
  /* ⚠️ A linha morta continua BOTÃO, e habilitada: é assim que ela segue
     alcançável pelo teclado e pelo leitor de tela. O ponteiro e o realce só
     aparecem quando o clique ainda faz algo -- a morta já lida não faz. */
  const clicavel = Boolean(onAbrir) && !(estadoMorto && notificacao.lida);

  return (
    <BotaoNu
      type="button"
      onClick={onAbrir}
      disabled={!onAbrir}
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
        {/* ⚠️ `wrap` e a data `nowrap`: com a marca da linha morta, as etiquetas
            passam da largura do painel. Sem isto a DATA quebrava na vírgula
            (medido em Chrome); com isto são as etiquetas que descem inteiras. */}
        <Flex align="center" gap="7px" rowGap="4px" mt="3px" minW="0" wrap="wrap">
          <Text fontSize="11px" color="fg.subtle" fontFamily="mono" whiteSpace="nowrap">
            {formatarDataHora(notificacao.criado_em)}
          </Text>
          <EtiquetasDeSubgrupo nomes={[subgrupoNome(notificacao.subgrupo_id)]} />
          {estadoMorto && (
            <Etiqueta cores={estadoMorto === ESTADO_DO_ALVO_EXCLUIDO ? CORES_DA_MARCA.neutra : CORES_DA_MARCA.aviso}>
              {MARCA_DO_ALVO[estadoMorto as keyof typeof MARCA_DO_ALVO]}
            </Etiqueta>
          )}
        </Flex>
      </Box>
    </BotaoNu>
  );
}
