import { Table } from "@chakra-ui/react";

import { ehPrevisao } from "../legendaDoFluxo";
import type { CelulaDoFluxoProps } from "./types";

/** Uma célula da tabela do fluxo -- cabeçalho ou corpo.
 *
 * 🔴 **A primeira coluna é `sticky`.** Com 24 meses a tabela rola na
 * horizontal, e sem isto quem rola até dezembro perde de que linha está
 * lendo. Ela precisa de fundo OPACO -- `sticky` sem fundo deixa as colunas
 * passarem por baixo do texto --, e o fundo tem de ser o DA LINHA: com um
 * branco fixo, a primeira célula de uma faixa colorida saía branca no meio
 * dela. Visto na tela.
 *
 * ⚠️ O recuo é `13px 14px`, a régua de toda `Table.Cell` do projeto -- há
 * guarda mecânico cobrando.
 */
export default function Celula({
  fixa, aDireita, previsao, forte, cabecalho, cor, fundo = "bg.surface", children,
}: CelulaDoFluxoProps) {
  const Como = cabecalho ? Table.ColumnHeader : Table.Cell;
  /* 🔴 O âmbar da previsão perde para o fundo da faixa: a faixa de ENTRADAS
     é verde de ponta a ponta, inclusive nas colunas futuras -- ela nomeia a
     seção, não um valor. */
  const daLinha = fundo !== "bg.surface" ? fundo : previsao ? "status.warn.bg" : undefined;
  /* A célula fixa precisa de fundo OPACO mesmo quando a linha não tem cor
     -- senão as colunas passam por baixo dela ao rolar. */
  const cheio = daLinha ?? (fixa ? "bg.surface" : undefined);

  return (
    <Como
      p="13px 14px"
      textAlign={aDireita ? "right" : "left"}
      whiteSpace="nowrap"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      fontSize={cabecalho ? "11px" : "13px"}
      fontWeight={cabecalho || forte ? "800" : "400"}
      letterSpacing={cabecalho ? "0.4px" : undefined}
      color={cor ?? (cabecalho ? "fg.muted" : undefined)}
      fontFamily={aDireita && !cabecalho ? "mono" : undefined}
      bg={cheio}
      position={fixa ? "sticky" : undefined}
      left={fixa ? "0" : undefined}
      zIndex={fixa ? 1 : undefined}
    >
      {children}
    </Como>
  );
}

/** ⚠️ Reexportado para quem monta as colunas não importar de dois lugares. */
export { ehPrevisao };
