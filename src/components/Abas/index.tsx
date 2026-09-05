import { Flex } from "@chakra-ui/react";

import { idDaAba, idDoPainel } from "../../utils/abas";
import { BotaoNu } from "../BotaoNu";
import type { AbasProps } from "./types";

/** Navegação por abas (`.tabs-row` do artifact): sublinhado de 2px na ativa,
 * sobre uma divisória de 1px que atravessa a linha inteira.
 *
 * `role="tablist"` e `aria-selected` são o que faz o leitor de tela anunciar
 * "aba 2 de 5" em vez de ler cinco botões soltos.
 *
 * ⚠️ `aria-controls` entrou em 26/08/2026, junto com `PainelDaAba`. Sem ele
 * o leitor anuncia as abas mas não sabe QUAL painel cada uma comanda -- e
 * quem navega por teclado não tem como pular da aba pro conteúdo dela. Os
 * ids saem de `utils/abas`, compartilhados com o painel.
 */
export default function Abas<T extends string>({ abas, ativa, onMudar, grupo }: AbasProps<T>) {
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
            id={idDaAba(grupo, aba.id)}
            role="tab"
            type="button"
            aria-selected={selecionada}
            aria-controls={idDoPainel(grupo, aba.id)}
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
