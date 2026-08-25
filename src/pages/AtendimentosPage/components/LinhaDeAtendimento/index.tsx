import { Box, Flex, Text } from "@chakra-ui/react";

import { Avatar, BotaoNu, Etiqueta, IconeClientes } from "../../../../components";
import { coresDoStatus } from "../../../../theme/atendimento";
import { formatarDataDeInstante } from "../../../../utils";
import type { Atendimento } from "../../../../types";

interface LinhaDeAtendimentoProps {
  atendimento: Atendimento;
  /** Nome de cada cliente vinculado. O atendimento guarda só os ids, e quem
   * resolve os nomes é a página -- numa consulta só pra lista inteira, em
   * vez de uma por linha. */
  /** Apelido de quem escreveu o último registro. O registro guarda só o
   * e-mail, e o avatar tira as iniciais do que receber -- sem resolver, a
   * lista mostrava as iniciais do E-MAIL ("jo") enquanto o detalhe mostrava
   * as do nome ("JM"), pra mesma pessoa. */
  nomeDoAutor: (email: string) => string;
  onAbrir: (atendimento: Atendimento) => void;
  ultima?: boolean;
}

/** Uma linha da lista de atendimentos (`.at-item` do artifact).
 *
 * Mostra a prévia do ÚLTIMO registro, não do primeiro: a pergunta de quem
 * varre a lista é "em que pé isso está", e o primeiro registro é o que ela
 * já sabe.
 *
 * As medidas do artifact aqui não são decorativas:
 * - a data é AZUL da marca e em mono (`.at-date`) -- é o que faz a lista se
 *   ler por data sem que a data precise de um rótulo;
 * - o cliente vem atrás do ícone de pessoas de 13px, que diz o que aquele
 *   nome É sem gastar a palavra "cliente" em toda linha;
 * - a prévia é uma CAIXA (fundo, borda, raio), não texto solto: é o que a
 *   separa do assunto quando os dois são frases parecidas.
 */
export default function LinhaDeAtendimento({
  atendimento,
  nomeDoAutor,
  onAbrir,
  ultima,
}: LinhaDeAtendimentoProps) {
  const registros = atendimento.registros || [];
  const ultimo = registros[registros.length - 1];

  /* Id que não resolve cai no próprio id -- some da tela seria pior: a
     linha não diria a quem o atendimento pertence. */
  const clientes = (
    atendimento.cliente_nomes?.length ? atendimento.cliente_nomes : atendimento.cliente_ids
  ).join(", ");

  return (
    <BotaoNu
      type="button"
      onClick={() => onAbrir(atendimento)}
      display="flex"
      alignItems="center"
      gap="16px"
      w="100%"
      textAlign="left"
      p="16px 18px"
      borderBottomWidth={ultima ? "0" : "1px"}
      borderBottomStyle="solid"
      borderBottomColor="border.subtle"
      _hover={{ bg: "bg.canvas" }}
    >
      <Box flex="1" minW="0">
        <Flex align="center" gap="8px" wrap="wrap" fontWeight="800" fontSize="13.5px">
          <Text as="span" color="fg.brand" fontFamily="mono" fontWeight="700">
            {formatarDataDeInstante(atendimento.criado_em)}
          </Text>
          <Text as="span">— {atendimento.assunto}</Text>
          <Etiqueta cores={coresDoStatus(atendimento.status)}>{atendimento.status}</Etiqueta>
        </Flex>

        {clientes && (
          <Flex align="center" gap="6px" mt="3px" color="fg.muted" fontSize="12.5px" minW="0">
            <Box color="fg.subtle" flexShrink="0" display="flex">
              <IconeClientes tamanho={13} />
            </Box>
            <Text truncate>{clientes}</Text>
          </Flex>
        )}
      </Box>

      {/* A caixa some nas telas estreitas: espremida vira duas palavras e
          reticências, que não respondem nada. */}
      {ultimo && (
        <Text
          flex="1"
          maxW="420px"
          minW="0"
          truncate
          bg="bg.canvas"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="border.subtle"
          borderRadius="sm"
          p="9px 12px"
          fontSize="12.5px"
          color="fg.muted"
          display={{ base: "none", lg: "block" }}
        >
          {ultimo.texto}
        </Text>
      )}

      {ultimo && (
        <Flex align="center" gap="12px" flex="0 0 auto">
          <Avatar nome={nomeDoAutor(ultimo.autor_id)} tamanho="pequeno" />
          <Text fontSize="11px" color="fg.subtle" textAlign="right" whiteSpace="nowrap">
            {formatarDataDeInstante(ultimo.registrado_em)}
          </Text>
        </Flex>
      )}
    </BotaoNu>
  );
}
