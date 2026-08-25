import type { VisaoDaAgenda } from "./types";

/** As quatro visões e seus rótulos, na ordem do artifact. */
export const VISOES: { id: VisaoDaAgenda; rotulo: string }[] = [
  { id: "lista", rotulo: "Em lista" },
  { id: "dia", rotulo: "Por dia" },
  { id: "semana", rotulo: "Por semana" },
  { id: "mes", rotulo: "Por mês" },
];

export function rotuloDaVisao(visao: VisaoDaAgenda): string {
  return VISOES.find((v) => v.id === visao)?.rotulo ?? "";
}

/** Começa no domingo -- é onde `gradeDoMes` e `inicioDaSemana` começam a
 * semana, e as três precisam concordar ou as colunas saem trocadas. */
export const DIAS_DA_SEMANA_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Quantos pontinhos uma célula do mês mostra antes de parar de contar.
 * Passar disso viraria uma fileira ilegível e empurraria a altura da
 * célula; o número exato se vê entrando no dia. */
export const PONTOS_POR_CELULA = 4;

/** Quantos dias a visão em lista cobre. Estava declarada dentro de
 * `periodoDaAgenda.ts` -- constante mora em `constants`, mesmo quando quem
 * a usa primeiro é um helper. */
export const DIAS_DA_LISTA = 14;
