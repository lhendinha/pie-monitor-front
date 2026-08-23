import { Flex } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface RodapeDeAcoesProps {
  children: ReactNode;
}

/** Rodapé de ações de modal ou de formulário em página
 * (`.modal-foot` / `.form-actions-foot` do artifact -- mesmo layout, dois
 * nomes lá).
 *
 * Diferente do `RodapeDeFiltro`: aquele é do painel de filtro (10px 12px,
 * gap 8) e este é de formulário (16px 22px, gap 10). Parecem o mesmo até
 * medir.
 */
export default function RodapeDeAcoes({ children }: RodapeDeAcoesProps) {
  return (
    <Flex
      justify="flex-end"
      gap="10px"
      p="16px 22px"
      borderTopWidth="1px"
      borderTopColor="border.subtle"
    >
      {children}
    </Flex>
  );
}
