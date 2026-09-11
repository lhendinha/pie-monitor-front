import { Box, Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../BotaoNu";
import { IconeCadeado, IconeLixeira } from "../../../../Icons";
import { ESTADO_DO_ALVO_EXCLUIDO, MARCA_DO_ALVO } from "../../../../../constants/notificacoes";
import { formatarDataHora } from "../../../../../utils";
import { detalheSecundario, frasePrincipal } from "../../../../../utils/notificacao";
import type { LinhaDeNotificacaoProps } from "./types";

/** A cor da marca da linha morta: cinza para excluído, e a cor de aviso para
 * sem acesso -- que pede atenção porque tem remédio (pedir acesso). */
const COR_DA_MARCA = { excluido: "fg.subtle", semAcesso: "status.warn.text" } as const;

/** Os ícones do sino são de 15px dentro de botão; na linha da data, ao lado de
 * texto de 11px, precisam ser do tamanho da letra. */
const ICONE_DA_MARCA = { "& > svg": { width: "12px", height: "12px", flex: "0 0 auto" } } as const;

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
  mostrarSubgrupo,
  ultima,
  subgrupoNome,
}: LinhaDeNotificacaoProps) {
  const nomeDoSubgrupo = notificacao.subgrupo_id ? subgrupoNome(notificacao.subgrupo_id) : "";
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
        {/* A linha morta fica APAGADA: de relance se vê quais não levam a lugar
            nenhum. O ponto azul e o peso da não lida continuam iguais -- o aviso
            ainda é um fato que aconteceu. */}
        <Text
          fontSize="13px"
          fontWeight={notificacao.lida ? "600" : "700"}
          color={estadoMorto ? "fg.muted" : undefined}
        >
          {frasePrincipal(notificacao)}
        </Text>
        <Text fontSize="12px" color={estadoMorto ? "fg.subtle" : "fg.muted"} mt="1px" truncate>
          {detalheSecundario(notificacao)}
        </Text>
        {/* 🔴 O subgrupo é TEXTO discreto ao lado da data, e não a etiqueta das
            tabelas. Numa tabela a etiqueta é uma coluna; aqui ela pesava mais
            que a própria data e disputava espaço com a marca da linha morta.
            Decisão do usuário, depois de ver as duas.

            ⚠️ Só aparece quando o painel mistura subgrupos (`mostrarSubgrupo`):
            com todas do mesmo, o nome repetido em cada linha não diferencia
            nada.

            ⚠️ `wrap` e a data `nowrap`: com a marca, o conteúdo pode passar da
            largura do painel. Sem isto a DATA quebrava na vírgula (medido em
            Chrome); com isto é o resto que desce inteiro. */}
        <Flex align="center" gap="7px" rowGap="4px" mt="3px" minW="0" wrap="wrap">
          <Text fontSize="11px" color="fg.subtle" fontFamily="mono" whiteSpace="nowrap">
            {formatarDataHora(notificacao.criado_em)}
          </Text>
          {mostrarSubgrupo && nomeDoSubgrupo && (
            <Text
              as="span"
              fontSize="11px"
              color="fg.subtle"
              title={nomeDoSubgrupo}
              truncate
              maxW="150px"
            >
              · {nomeDoSubgrupo}
            </Text>
          )}
          {estadoMorto && (
            <Flex
              align="center"
              gap="4px"
              whiteSpace="nowrap"
              color={estadoMorto === ESTADO_DO_ALVO_EXCLUIDO ? COR_DA_MARCA.excluido : COR_DA_MARCA.semAcesso}
              css={ICONE_DA_MARCA}
            >
              {estadoMorto === ESTADO_DO_ALVO_EXCLUIDO ? <IconeLixeira /> : <IconeCadeado />}
              <Text as="span" fontSize="11px" fontWeight="600">
                {MARCA_DO_ALVO[estadoMorto as keyof typeof MARCA_DO_ALVO]}
              </Text>
            </Flex>
          )}
        </Flex>
      </Box>
    </BotaoNu>
  );
}
