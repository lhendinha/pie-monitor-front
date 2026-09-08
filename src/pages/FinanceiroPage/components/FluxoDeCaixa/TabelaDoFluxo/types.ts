import type { ReactNode } from "react";

import type { FluxoDeCaixa, LinhaDoFluxo } from "../../../../../types";

export interface TabelaDoFluxoProps {
  fluxo: FluxoDeCaixa;
  /** O mês corrente (`aaaa-mm`). Vem de quem chama para o teste congelar
   * "hoje" sem mexer no relógio do componente. */
  mesCorrente: string;
  /** O nome do período escolhido, para a legenda do topo. */
  rotuloDoPeriodo: string;
  /** As seções dobradas -- `entrada` e/ou `saida`. */
  dobrados: string[];
  onAlternar: (natureza: string) => void;
}

export interface CelulaDoFluxoProps {
  /** Primeira coluna: fica fixa na rolagem horizontal. */
  fixa?: boolean;
  aDireita?: boolean;
  /** Coluna que ainda não aconteceu inteira -- fundo âmbar. */
  previsao?: boolean;
  forte?: boolean;
  cabecalho?: boolean;
  /** Cor do texto, quando a linha tem uma (verde no total de entradas,
   * vermelho no de saídas). */
  cor?: string;
  /** O fundo da LINHA. A célula fixa o repete: `sticky` sem fundo opaco
   * deixa as colunas passarem por baixo do texto. */
  fundo?: string;
  children: ReactNode;
}

export interface FaixaDaSecaoProps {
  rotulo: string;
  /** `entrada`, `saida` ou vazio (a faixa do saldo, que não dobra). */
  natureza?: string;
  quantasColunas: number;
  fundo: string;
  cor: string;
  dobrada?: boolean;
  onAlternar?: (natureza: string) => void;
}

export interface SecaoDoFluxoProps {
  natureza: string;
  rotulo: string;
  rotuloDoTotal: string;
  linhas: LinhaDoFluxo[];
  meses: string[];
  totalPorMes: Record<string, number>;
  mesCorrente: string;
  dobrada: boolean;
  onAlternar: (natureza: string) => void;
}

export interface LinhaDeSaldoProps {
  rotulo: string;
  valores: Record<string, number>;
  meses: string[];
  mesCorrente: string;
  forte?: boolean;
}
