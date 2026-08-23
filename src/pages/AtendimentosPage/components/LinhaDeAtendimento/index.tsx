import { Box, Flex, Text } from "@chakra-ui/react";

import { Avatar, BotaoNu, Etiqueta } from "../../../../components";
import { coresDoStatus } from "../../../../theme/atendimento";
import { formatarData } from "../../../../utils";
import type { Atendimento } from "../../../../types";

interface Props {
  atendimento: Atendimento;
  /** Nome de cada cliente vinculado. O atendimento guarda só os ids, e quem
   * resolve os nomes é a página -- numa consulta só pra lista inteira, em
   * vez de uma por linha. */
  nomeDoCliente: (id: string) => string | undefined;
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
 */
export default function LinhaDeAtendimento({
  atendimento,
  nomeDoCliente,
  nomeDoAutor,
  onAbrir,
  ultima,
}: Props) {
  const registros = atendimento.registros || [];
  const ultimo = registros[registros.length - 1];

  /* Nome de quem não é mais membro (ou de um id que não resolve) cai no
     próprio id -- some da tela seria pior: a linha diria que ninguém
     escreveu. */
  const clientes = atendimento.cliente_ids
    .map((id) => nomeDoCliente(id) ?? id)
    .join(", ");

  return (
    <BotaoNu
      type="button"
      onClick={() => onAbrir(atendimento)}
      display="flex"
      alignItems="center"
      gap="14px"
      w="100%"
      textAlign="left"
      p="13px 12px"
      borderBottomWidth={ultima ? "0" : "1px"}
      borderBottomStyle="solid"
      borderBottomColor="border.subtle"
      _hover={{ bg: "bg.canvas" }}
    >
      <Box flex="1" minW="0">
        <Flex align="center" gap="8px" wrap="wrap">
          <Text as="span" fontSize="12px" color="fg.muted" fontFamily="mono">
            {formatarData(atendimento.criado_em)}
          </Text>
          <Text as="span" fontWeight="700" fontSize="13.5px">
            — {atendimento.assunto}
          </Text>
          <Etiqueta cores={coresDoStatus(atendimento.status)}>{atendimento.status}</Etiqueta>
        </Flex>
        {clientes && (
          <Text fontSize="12px" color="fg.muted" mt="3px" truncate>
            {clientes}
          </Text>
        )}
      </Box>

      {/* A prévia some nas telas estreitas: espremida vira duas palavras e
          reticências, que não respondem nada. */}
      <Text
        flex="1"
        minW="0"
        truncate
        fontSize="12.5px"
        color="fg.muted"
        display={{ base: "none", lg: "block" }}
      >
        {ultimo?.texto}
      </Text>

      {ultimo && (
        <Flex align="center" gap="8px" flexShrink="0">
          <Avatar nome={nomeDoAutor(ultimo.autor_id)} tamanho="pequeno" />
          <Text fontSize="11.5px" color="fg.muted" whiteSpace="nowrap">
            {formatarData(ultimo.registrado_em)}
          </Text>
        </Flex>
      )}
    </BotaoNu>
  );
}
