import { Flex, Heading, Text } from "@chakra-ui/react";

import type { SubcabecalhoDaListaProps } from "./types";

/** O título, a contagem e o botão de criar, acima de cada lista do catálogo
 * (`.subcabecalho` do artifact).
 *
 * ⚠️ A contagem existe para a lista dizer o TAMANHO sem que ninguém precise
 * rolar até o fim -- e é o mesmo padrão de "Mostrando N de N" das outras
 * telas. As medidas saem do artifact: 16,5px/800 no título, 11,5px apagado
 * na contagem.
 *
 * ⚠️ `acao` é opcional porque centro de custo NÃO tem botão: ele nasce de um
 * campo no topo do próprio cartão (achado 10 da auditoria do plano -- eram
 * três modais, viraram dois).
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function SubcabecalhoDaLista({
  titulo,
  contagem,
  acao,
}: SubcabecalhoDaListaProps) {
  return (
    <Flex align="center" justify="space-between" gap="16px" m="4px 0 14px">
      <div>
        <Heading as="h2" fontSize="16.5px" fontWeight="800" m="0">
          {titulo}
        </Heading>
        <Text fontSize="11.5px" color="fg.muted" m="2px 0 0">
          {contagem}
        </Text>
      </div>
      {acao}
    </Flex>
  );
}
