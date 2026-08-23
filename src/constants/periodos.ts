/** As opções do filtro de período, na ordem e nos grupos do artifact.
 *
 * Três blocos separados por divisória, e não uma lista corrida: "Amanhã" e
 * "Ontem" lado a lado, sem separação, fazem a pessoa escolher o passado
 * achando que escolheu o futuro. A divisória é a informação.
 *
 * Ficam em `src/constants` e não dentro do Kanban porque o artifact usa a
 * mesma lista em dois lugares (`scope` de `kanban` e de `agenda`) -- a
 * Agenda vai consumir daqui quando existir.
 */
export interface OpcaoDePeriodo {
  /** Não pode ser vazio: item de menu com `value=""` o zag não registra. */
  id: string;
  rotulo: string;
}

export const PERIODOS_FUTUROS: readonly OpcaoDePeriodo[] = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "amanha", rotulo: "Amanhã" },
  { id: "semana", rotulo: "Esta semana" },
  { id: "mes", rotulo: "Este mês" },
  { id: "prox3", rotulo: "Próximos 3 dias" },
  { id: "proxsemana", rotulo: "Próxima semana" },
  { id: "proxmes", rotulo: "Próximo mês" },
];

export const PERIODOS_PASSADOS: readonly OpcaoDePeriodo[] = [
  { id: "ontem", rotulo: "Ontem" },
  { id: "ult7", rotulo: "Últimos 7 dias" },
  { id: "ult30", rotulo: "Últimos 30 dias" },
];

/** Sem limite nenhum.
 *
 * ⚠️ O id é a string "todos", mas ele NUNCA vira uma janela de datas -- o
 * artifact anota que isso já foi bug lá: a string virava filtro de verdade
 * e escondia o quadro inteiro. `intervaloDoPeriodo` devolve `null` aqui. */
export const PERIODO_TODOS = "todos";

/** Intervalo escolhido a dedo no calendário. */
export const PERIODO_PERSONALIZADO = "personalizado";
