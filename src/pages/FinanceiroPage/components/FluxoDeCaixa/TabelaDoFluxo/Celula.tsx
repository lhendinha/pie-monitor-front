import { Table } from "@chakra-ui/react";

import type { CelulaDoFluxoProps } from "./types";

/** Uma célula da tabela do fluxo -- cabeçalho ou corpo.
 *
 * 🔴 **A primeira coluna é `sticky`.** Com 24 meses a tabela rola na
 * horizontal, e sem isto quem rola até dezembro perde o nome da categoria
 * que está lendo. Ela precisa de fundo OPACO: `sticky` sem fundo deixa as
 * colunas passarem por baixo do texto.
 *
 * ⚠️ O recuo é `13px 14px`, a régua de toda `Table.Cell` do projeto -- há
 * guarda mecânico cobrando.
 */
export default function Celula({
  fixa, aDireita, realcada, forte, cabecalho, separada, fundo = "bg.surface", children,
}: CelulaDoFluxoProps) {
  const Como = cabecalho ? Table.ColumnHeader : Table.Cell;
  return (
    <Como
      /* ⚠️ Marcador para o teste: a COR do realce vira classe do Chakra, e
         `getComputedStyle` em jsdom devolve transparente nos dois casos --
         a cor se afere em Chrome (`verificar-financeiro.mjs`). O que dá para
         provar aqui é QUAL coluna foi marcada, que é a metade que erra. */
      data-mes-corrente={realcada ? "sim" : undefined}
      p="13px 14px"
      textAlign={aDireita ? "right" : "left"}
      whiteSpace="nowrap"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      borderTopWidth={separada ? "1px" : undefined}
      borderTopColor="border"
      fontSize={cabecalho ? "11px" : "13px"}
      fontWeight={cabecalho || forte ? "800" : "400"}
      textTransform={cabecalho ? "uppercase" : undefined}
      letterSpacing={cabecalho ? "0.4px" : undefined}
      color={cabecalho ? "fg.subtle" : undefined}
      fontFamily={aDireita && !cabecalho ? "mono" : undefined}
      /* 🔴 A célula fixa precisa de fundo OPACO -- `sticky` sem fundo deixa as
         colunas passarem por baixo do texto --, e ele tem de ser o da LINHA.
         Com `bg.surface` fixo, a primeira célula da linha de seção saía
         BRANCA no meio de uma faixa cinza. Visto na tela. */
      bg={realcada ? "bg.brand.subtle" : fixa ? fundo : undefined}
      position={fixa ? "sticky" : undefined}
      left={fixa ? "0" : undefined}
      zIndex={fixa ? 1 : undefined}
    >
      {children}
    </Como>
  );
}
