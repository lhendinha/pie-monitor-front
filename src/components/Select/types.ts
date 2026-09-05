import type { OpcaoDeSelect } from "../../types";

/** O que `useBuscaDoPainel` devolve: o termo digitado no painel do select,
 * a lista que ele mostra e quantos ficaram de fora. */
export interface EstadoDaBuscaDoPainel {
  busca: string;
  mudarBusca: (termo: string) => void;
  /** O que o react-select recebe: a lista já filtrada, no caso local; a
   * lista que o pai trouxe, no remoto. */
  opcoesVisiveis: OpcaoDeSelect[];
  /** Quantos casaram com o termo mas não couberam no teto. Zero na imensa
   * maioria das vezes; quando não é, o painel PRECISA dizer. */
  ocultos: number;
}
