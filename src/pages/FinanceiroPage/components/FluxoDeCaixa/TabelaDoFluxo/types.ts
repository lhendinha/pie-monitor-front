import type { ReactNode } from "react";

import type { FluxoDeCaixa, LinhaDoFluxo } from "../../../../../types";

export interface TabelaDoFluxoProps {
  fluxo: FluxoDeCaixa;
  /** O mês corrente (`aaaa-mm`), realçado na tabela. Vem de quem chama para
   * o teste congelar "hoje" sem mexer no relógio do componente. */
  mesCorrente: string;
  /** As seções dobradas -- `entrada` e/ou `saida`. */
  dobrados: string[];
  onAlternar: (natureza: string) => void;
}

export interface CelulaDoFluxoProps {
  /** Primeira coluna: fica fixa na rolagem horizontal. */
  fixa?: boolean;
  aDireita?: boolean;
  /** Coluna do mês corrente. */
  realcada?: boolean;
  /** Linha de total ou de saldo final. */
  forte?: boolean;
  cabecalho?: boolean;
  /** Abre o bloco do saldo com uma divisória em cima. */
  separada?: boolean;
  /** O fundo da LINHA. A célula fixa o repete: `sticky` sem fundo opaco
   * deixa as colunas passarem por baixo do texto, e um branco fixo fazia a
   * primeira célula da linha de seção destoar da faixa cinza. */
  fundo?: string;
  children: ReactNode;
}

export interface SecaoDoFluxoProps {
  natureza: string;
  rotulo: string;
  linhas: LinhaDoFluxo[];
  meses: string[];
  /** Total da seção por mês, e a parte dele que JÁ ACONTECEU. */
  totalPorMes: Record<string, number>;
  realizadoPorMes: Record<string, number>;
  mesCorrente: string;
  dobrada: boolean;
  onAlternar: (natureza: string) => void;
}

export interface LinhaDeSaldoProps {
  rotulo: string;
  valores: Record<string, number>;
  meses: string[];
  mesCorrente: string;
  /** A primeira das três: abre o bloco com uma divisória. */
  primeira?: boolean;
}
