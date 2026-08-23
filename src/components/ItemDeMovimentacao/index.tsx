import { Box, Flex, Text } from "@chakra-ui/react";
import DOMPurify from "dompurify";
import Ponto from "../Ponto";

interface Props {
  titulo: string;
  meta: string;
  /** HTML vindo da API do PJe -- sanitizado aqui, nunca antes. */
  html?: string;
  /** Texto puro, quando a comunicação original não foi encontrada e só
   * restou o que o envio guardou. */
  textoPlano?: string;
  /** Última linha da lista não desenha divisória. */
  ultimo?: boolean;
}

/** Uma movimentação numa lista (`.hist-item` do artifact): bolinha da
 * marca, título, meta e o texto do tribunal num bloco recuado.
 *
 * Substitui o `ComunicacaoCard`, que vinha do `index.css` e desenhava um
 * cartão dentro do cartão -- moldura demais, e destoava do resto da tela.
 */
export default function ItemDeMovimentacao({ titulo, meta, html, textoPlano, ultimo }: Props) {
  return (
    <Flex
      gap="14px"
      p="15px 14px"
      borderBottomWidth={ultimo ? "0" : "1px"}
      borderBottomColor="border.subtle"
      _hover={{ bg: "bg.canvas" }}
      transition="background .1s"
    >
      <Ponto noTopo />
      <Box minW="0" flex="1">
        <Text fontSize="13.5px" fontWeight="700">
          {titulo}
        </Text>
        <Text fontSize="12px" color="fg.subtle" mt="3px">
          {meta}
        </Text>
        {(html || textoPlano) && (
          <Box
            /* `.detail-texto` do artifact: bloco recuado, com teto de altura
               -- publicação de tribunal pode ter páginas de texto. */
            mt="10px"
            p="12px 14px"
            fontSize="13px"
            lineHeight="1.6"
            bg="bg.canvas"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="md"
            maxH="200px"
            overflowY="auto"
            whiteSpace="pre-wrap"
            {...(html
              ? { dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(html) } }
              : { children: textoPlano })}
          />
        )}
      </Box>
    </Flex>
  );
}
