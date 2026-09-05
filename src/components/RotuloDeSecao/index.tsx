import { Text } from "@chakra-ui/react";
import type { RotuloDeSecaoProps } from "./types";

/** Divisor nomeado dentro de um formulário (`.section-label` do artifact):
 * 13px/800 com uma linha fina acima.
 *
 * Não é o título do cartão: serve pra partir um formulário longo em blocos
 * com nome ("Informações pessoais", "Conta") sem precisar de um cartão
 * pra cada um.
 */
export default function RotuloDeSecao({ primeiro, children }: RotuloDeSecaoProps) {
  return (
    <Text
      as="p"
      fontSize="13px"
      fontWeight="800"
      mb="14px"
      pt={primeiro ? undefined : "16px"}
      borderTopWidth={primeiro ? undefined : "1px"}
      borderTopColor="border.subtle"
    >
      {children}
    </Text>
  );
}
