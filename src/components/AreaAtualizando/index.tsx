import { Box } from "@chakra-ui/react";
import type { AreaAtualizandoProps } from "./types";

/** Envolve uma lista que está sendo trocada, mantendo o conteúdo antigo
 * visível e apagado.
 *
 * É o par obrigatório do `placeholderData: keepPreviousData`. Sozinho, ele
 * resolve o pisca (a tabela parava de virar esqueleto a cada página) e cria
 * outro problema no lugar: a pessoa passa a ler números velhos achando que
 * são os novos, sem nada dizendo o contrário. Apagado, o conteúdo continua
 * legível -- dá pra manter o lugar na leitura -- mas anuncia que não é o
 * definitivo.
 *
 * `pointerEvents: none` junto: clicar numa linha que está prestes a ser
 * substituída abre o item errado.
 */
export default function AreaAtualizando({ atualizando, children }: AreaAtualizandoProps) {
  return (
    <Box
      aria-busy={atualizando || undefined}
      opacity={atualizando ? 0.55 : 1}
      pointerEvents={atualizando ? "none" : undefined}
      /* Só na entrada do estado apagado: a volta é instantânea, senão o
         conteúdo novo chega "aparecendo" e parece outro carregamento. */
      transition={atualizando ? "opacity 120ms ease-out" : undefined}
    >
      {children}
    </Box>
  );
}
