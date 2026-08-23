import { SimpleGrid } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface LinhaDeCamposProps {
  /** Colunas da grade, quando os dois campos não merecem o mesmo espaço --
   * "2fr 1fr" dá o dobro ao primeiro. Um endereço de e-mail precisa caber
   * inteiro; um seletor de três itens, não. */
  proporcoes?: string;
  children: ReactNode;
}

/** Dois campos lado a lado (`.field-row` do artifact): grade de 1fr 1fr com
 * 14px de intervalo.
 *
 * Vira uma coluna só abaixo de 640px -- dois campos de data espremidos num
 * celular não são utilizáveis, e o artifact faz o mesmo no seu media query.
 */
export default function LinhaDeCampos({ proporcoes, children }: LinhaDeCamposProps) {
  return (
    <SimpleGrid
      /* ⚠️ `templateColumns` SEMPRE, nunca `columns={{ base: 1, sm: 2 }}`.
         Aquela forma nunca chegou a duas colunas: medido no navegador, saía
         `grid-template-columns: 516px` num viewport de 1440 -- um campo
         embaixo do outro em todos os formulários do sistema, e o lado a
         lado do artifact perdido em silêncio. */
      templateColumns={{ base: "1fr", sm: proporcoes ?? "1fr 1fr" }}
      /* Espaço só na HORIZONTAL. Empilhado (celular, ou uma linha de um
         campo só), o vertical já vem dos 16px de margem do `Campo` -- somar
         o `gap` dava 30px ali e 16px entre os campos soltos, que é a
         irregularidade que aparecia no modal de tarefa. */
      columnGap="14px"
      rowGap="0"
    >
      {children}
    </SimpleGrid>
  );
}
