import { Box, Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../BotaoNu";
import IconeSeta from "../Icons/IconeSeta";
import Ponto from "../Ponto";

interface ItemDeMovimentacaoProps {
  titulo: string;
  meta: string;
  /** Abre o detalhe. Sem isto a linha é só leitura -- e sem afordância
   * nenhuma de clique, que é o que se espera de um bloco de texto. */
  onAbrir?: () => void;
  /** Última linha da lista não desenha divisória. */
  ultimo?: boolean;
}

/** Uma movimentação numa lista (`.hist-item` do artifact): bolinha da
 * marca, título e meta.
 *
 * 🔴 **O texto do tribunal NÃO vem mais aqui.** Cada item despejava a
 * publicação inteira num bloco rolável de 200px, e uma página de cinco
 * itens virava cinco áreas de rolagem empilhadas dentro da rolagem da
 * página -- ninguém consegue percorrer a lista assim, e o texto que
 * importa é sempre o de UM item. Hoje o teor vive no modal, que é onde há
 * espaço pra ele. Ver `ModalDeMovimentacao`.
 *
 * Substitui o `ComunicacaoCard`, que vinha do design antigo e desenhava um
 * cartão dentro do cartão -- moldura demais, e destoava do resto da tela.
 */
export default function ItemDeMovimentacao({
  titulo,
  meta,
  onAbrir,
  ultimo,
}: ItemDeMovimentacaoProps) {
  const conteudo = (
    <>
      <Ponto noTopo />
      <Box minW="0" flex="1" textAlign="left">
        <Text fontSize="13.5px" fontWeight="700">
          {titulo}
        </Text>
        <Text fontSize="12px" color="fg.subtle" mt="3px">
          {meta}
        </Text>
      </Box>
      {onAbrir && (
        /* Seta pra direita = `IconeSeta` espelhado, como o próprio ícone
           documenta (é um desenho só, não dois). Marca a linha como caminho
           pra algum lugar -- é o que a diferencia de um parágrafo. */
        <Flex color="fg.subtle" flexShrink={0} transform="scaleX(-1)">
          <IconeSeta />
        </Flex>
      )}
    </>
  );

  const estilo = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    p: "15px 14px",
    w: "100%",
    borderBottomWidth: ultimo ? "0" : "1px",
    borderBottomColor: "border.subtle",
    transition: "background .1s",
  } as const;

  if (!onAbrir) {
    return <Box {...estilo}>{conteudo}</Box>;
  }

  return (
    <BotaoNu type="button" onClick={onAbrir} {...estilo} _hover={{ bg: "bg.canvas" }}>
      {conteudo}
    </BotaoNu>
  );
}
