/** A forma das chamadas e dos envelopes da API. */

export interface RespostaCruaDaApi {
  ok: boolean;
  status: number;
  /** O JSON cru da resposta. `unknown`, não `any`: quem lê tem de dizer o
   * que espera -- é `chamar<T>` que o converte no tipo do chamador. */
  dados: unknown;
}

/** O envelope de qualquer listagem paginada da API. */
export interface EnvelopePaginado {
  total: number;
  total_paginas: number;
  [chave: string]: unknown;
}

/** O par que `todasAsPaginas` passa a cada volta do laço. */
export interface OpcoesDePaginacao {
  pagina?: number;
  tamanhoPagina?: number;
}

/** Valor de um parâmetro de query. Array vira **parâmetro repetido**
 * (`?fase_id=a&fase_id=b`), que é o formato que o FastAPI lê como lista --
 * usado pelos filtros de seleção múltipla. */
export type ValorDeParametroDeQuery = string | string[] | undefined;
