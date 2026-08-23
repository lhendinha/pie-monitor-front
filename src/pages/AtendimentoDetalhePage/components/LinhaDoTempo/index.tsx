import { Box, Flex, Text } from "@chakra-ui/react";

import { Avatar } from "../../../../components";
import { formatarDataHora } from "../../../../utils";
import type { RegistroDeAtendimento } from "../../../../types";

interface Props {
  registros: RegistroDeAtendimento[];
  /** Apelido de quem escreveu. O registro guarda só o e-mail, e quem
   * resolve o nome é a página. */
  nomeDoAutor: (email: string) => string;
}

/** A linha do tempo do atendimento (`.timeline` do artifact).
 *
 * Ordem de escrita, do mais antigo pro mais novo: é uma conversa, e ler de
 * trás pra frente perde o encadeamento. O campo de escrever fica no fim,
 * logo abaixo do último -- onde a leitura termina.
 *
 * Append-only: não há editar nem excluir registro, nem aqui nem no
 * servidor. É registro de atendimento a cliente.
 */
export default function LinhaDoTempo({ registros, nomeDoAutor }: Props) {
  return (
    <Flex direction="column">
      {registros.map((registro, indice) => (
        <Flex
          key={`${registro.registrado_em}:${indice}`}
          gap="12px"
          py="14px"
          borderBottomWidth={indice === registros.length - 1 ? "0" : "1px"}
          borderBottomStyle="solid"
          borderBottomColor="border.subtle"
        >
          <Avatar nome={nomeDoAutor(registro.autor_id)} tamanho="pequeno" />
          <Box
            flex="1"
            minW="0"
            bg="bg.canvas"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.subtle"
            borderRadius="md"
            p="11px 14px"
          >
            <Flex align="center" gap="8px" mb="4px" wrap="wrap">
              <Text as="span" fontWeight="800" fontSize="12.5px">
                {nomeDoAutor(registro.autor_id)}
              </Text>
              <Text as="span" fontSize="11.5px" color="fg.subtle" fontFamily="mono">
                {formatarDataHora(registro.registrado_em)}
              </Text>
            </Flex>
            {/* `pre-wrap` porque o texto vem de um textarea: sem isso as
                quebras de linha que a pessoa digitou viram um parágrafo
                corrido. */}
            <Text fontSize="13px" whiteSpace="pre-wrap">
              {registro.texto}
            </Text>
          </Box>
        </Flex>
      ))}
    </Flex>
  );
}
