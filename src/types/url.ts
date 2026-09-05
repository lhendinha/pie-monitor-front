/** Estado de listagem guardado na URL. */

/** O que a query string sabe guardar. Cobre tudo que as listagens filtram. */
export type ValorDaUrl = string | number | boolean | string[];

/** O setter que `useEstadoNaUrl` devolve -- mesma forma da do `useState`. */
export type MudarEstadoNaUrl<T> = (proximo: T | ((atual: T) => T)) => void;

/** Tira o tipo LITERAL da inferência: `1` vira `number`, `""` vira `string`.
 *
 * 🔴 Sem isto, `useEstadoNaUrl("pagina", 1)` infere `T = 1` -- e o setter
 * passa a aceitar apenas o número um. O `tsc` acusou em quatro telas de uma
 * vez, e a primeira saída foi declarar uma sobrecarga por tipo: quatro
 * assinaturas quase iguais para dizer o que uma linha diz.
 *
 * ⚠️ Lista fica como está: `string[]` não é literal, e alargar `never[]` (o
 * que `[]` infere) não teria sentido -- quem passa lista vazia anota o tipo. */
export type Alargado<T> = T extends number
  ? number
  : T extends boolean
    ? boolean
    : T extends string
      ? string
      : T;

export interface OpcoesDoEstadoNaUrl {
  /** Chaves que somem da URL quando ESTA muda -- na MESMA escrita.
   *
   * 🔴 Existe por um defeito concreto: filtrar estando na página 2 pedia a
   * página 2 do conjunto NOVO, que quase nunca existe -- lista vazia sem
   * motivo aparente. A correção óbvia (`setBusca(v); setPagina(1)`) NÃO
   * funciona: `setSearchParams` navega na hora, então as duas chamadas do
   * mesmo manipulador partem da mesma URL e a segunda apaga a primeira. Uma
   * escrita só é o que resolve.
   *
   * ⚠️ É por isso que o reset da página não mora na tela: ele é propriedade
   * do filtro, e fica escrito onde o filtro é declarado. */
  tambemApaga?: string[];
}
