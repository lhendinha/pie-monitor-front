import type { Tarefa } from "../../types";

/** Um número do "Resumo rápido". */
export interface NumeroDoResumo {
  rotulo: string;
  valor: number;
  /** O que a linha ESCREVE, quando não é o número cru -- hoje, dinheiro
   * ("R$ 12.480,00").
   *
   * 🔴 Separado de `valor` de propósito: é o `valor` que decide se a cor
   * aparece (zero não grita), e formatá-lo em texto perderia essa régua.
   * Uma linha de dinheiro em zero é notícia boa igual às outras. */
  texto?: string;
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
