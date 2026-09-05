import { Box } from "@chakra-ui/react";
import DOMPurify from "dompurify";
import type { TextoDaComunicacaoProps } from "./types";

/** O texto do tribunal num bloco recuado (`.detail-texto` do artifact).
 *
 * O teto de altura existe porque publicação de tribunal pode ter páginas de
 * texto: numa lista, um item não pode empurrar os outros pra fora da tela.
 */
export default function TextoDaComunicacao({ html, textoPlano, inteiro }: TextoDaComunicacaoProps) {
  if (!html && !textoPlano) return null;
  return (
    <Box
      mt="10px"
      p="12px 14px"
      fontSize="13px"
      lineHeight="1.6"
      bg="bg.canvas"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="md"
      maxH={inteiro ? undefined : "200px"}
      overflowY={inteiro ? undefined : "auto"}
      /* Tabela de publicação costuma ser mais larga que o modal -- rola
         dentro do próprio bloco em vez de empurrar a página pro lado. */
      overflowX="auto"
      whiteSpace="pre-wrap"
      {...(html
        ? { dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(html) } }
        : { children: textoPlano })}
    />
  );
}
