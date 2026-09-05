import { Flex } from "@chakra-ui/react";
import type { LinhaDeListaProps } from "./types";

/** Uma linha de lista dentro de um cartão (`.subgrupo-row` do artifact):
 * tudo em UMA linha horizontal -- ícone, conteúdo, ações -- com divisória
 * embaixo, e a última sem divisória, pra não desenhar um risco solto antes
 * da borda do cartão.
 *
 * Os 16px valem pra todo SVG da linha, ícone e botões: é o que o artifact
 * computa, porque lá `.subgrupo-row svg` vem depois de `.btn-sq svg` na
 * folha e as duas regras têm a mesma especificidade.
 */
export default function LinhaDeLista({ icone, acoes, children }: LinhaDeListaProps) {
  return (
    <Flex
      align="center"
      gap="10px"
      p="13px 4px"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
      css={{ "& svg": { width: "16px", height: "16px", flex: "0 0 auto" } }}
    >
      {icone && (
        <Flex color="fg.subtle" flexShrink={0}>
          {icone}
        </Flex>
      )}
      {children}
      {acoes && (
        <Flex ml="auto" gap="6px" flexShrink={0}>
          {acoes}
        </Flex>
      )}
    </Flex>
  );
}
