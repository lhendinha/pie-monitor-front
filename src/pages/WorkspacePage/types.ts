import type { Tarefa } from "../../types";

/** Um número do "Resumo rápido". */
export interface NumeroDoResumo {
  rotulo: string;
  valor: number;
  /** Só destaca em cor quando há o que destacar: um zero vermelho grita
   * sobre a ausência de problema. */
  tom?: "bad" | "warn";
  /** Pra onde o clique leva, com o filtro que gerou o número. Sem destino,
   * a linha não é clicável -- botão que não vai a lugar nenhum é pior que
   * texto. */
  ir?: () => void;
}

/** A tarefa e quem passa a ser responsável por ela. */
export interface AssumirTarefa {
  tarefa: Tarefa;
  email: string;
}

/** Quem o cartão mostra: um responsável, ou as sem responsável nenhum. */
export interface FiltroDoCard {
  responsavel?: string;
  semResponsavel?: boolean;
}
