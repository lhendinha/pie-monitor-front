import { Flex } from "@chakra-ui/react";

import { BotaoNu } from "../BotaoNu";

interface Aba<T extends string> {
  id: T;
  rotulo: string;
}

interface AbasProps<T extends string> {
  abas: Aba<T>[];
  ativa: T;
  onMudar: (id: T) => void;
}

/** Navegação por abas (`.tabs-row` do artifact): sublinhado de 2px na ativa,
 * sobre uma divisória de 1px que atravessa a linha inteira.
 *
 * `role="tablist"` e `aria-selected` são o que faz o leitor de tela
 * anunciar "aba 2 de 5" em vez de ler cinco botões soltos.
 */
export default function Abas<T extends string>({ abas, ativa, onMudar }: AbasProps<T>) {
  return (
    <Flex
      role="tablist"
      gap="4px"
      mb="18px"
      borderBottomWidth="1px"
      borderBottomColor="border"
    >
      {abas.map((aba) => {
        const selecionada = aba.id === ativa;
        return (
          <BotaoNu
            key={aba.id}
            role="tab"
            type="button"
            aria-selected={selecionada}
            onClick={() => onMudar(aba.id)}
            p="11px 4px"
            mr="22px"
            mb="-1px"
            fontSize="13.5px"
            fontWeight="700"
            /* `normal`, como o `<button>` do navegador: com a altura de
               linha do corpo (1.45) a aba ficava 2px mais alta que a do
               artifact, e a divisória de baixo saía do lugar. */
            lineHeight="normal"
            color={selecionada ? "brand.darker" : "fg.subtle"}
            borderBottomWidth="2px"
            borderBottomColor={selecionada ? "fg.brand" : "transparent"}
            _hover={{ color: selecionada ? "brand.darker" : "fg" }}
          >
            {aba.rotulo}
          </BotaoNu>
        );
      })}
    </Flex>
  );
}
