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
import type { OpcaoDeMenu } from "../types";

export const PERIODOS_FUTUROS: readonly OpcaoDeMenu[] = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "amanha", rotulo: "Amanhã" },
  { id: "semana", rotulo: "Esta semana" },
  { id: "mes", rotulo: "Este mês" },
  { id: "prox3", rotulo: "Próximos 3 dias" },
  { id: "proxsemana", rotulo: "Próxima semana" },
  { id: "proxmes", rotulo: "Próximo mês" },
];

export const PERIODOS_PASSADOS: readonly OpcaoDeMenu[] = [
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

/** Os mesmos três blocos, com as opções que fazem sentido para DINHEIRO.
 *
 * 🔴 As opções de DIA do Kanban ficam de fora -- Amanhã, Ontem, Próximos 3
 * dias. Dinheiro se conta em mês: ninguém pergunta "quanto entra amanhã",
 * pergunta "quanto entra este mês". Uma lista com as duas coisas faria a
 * pessoa procurar o mês entre opções de dia.
 *
 * ⚠️ Trocam "Próxima semana" por "Próximos 7 dias" e ganham "Este ano" e
 * "Mês passado": a comparação com o mês anterior é a pergunta que todo
 * escritório faz, e o ano é o horizonte do fluxo de caixa.
 *
 * ➡️ `SeletorDePeriodo` recebe estes blocos pela prop `blocos`; o padrão dela
 * são os do Kanban, para o Kanban e a Agenda não mudarem.
 */
export const PERIODOS_DE_DINHEIRO: readonly (readonly OpcaoDeMenu[])[] = [
  [
    { id: "hoje", rotulo: "Hoje" },
    { id: "semana", rotulo: "Esta semana" },
    { id: "mes", rotulo: "Este mês" },
    { id: "ano", rotulo: "Este ano" },
  ],
  [
    { id: "prox7", rotulo: "Próximos 7 dias" },
    { id: "prox30", rotulo: "Próximos 30 dias" },
    { id: "proxmes", rotulo: "Próximo mês" },
  ],
  [
    { id: "ult7", rotulo: "Últimos 7 dias" },
    { id: "ult30", rotulo: "Últimos 30 dias" },
    { id: "mespassado", rotulo: "Mês passado" },
  ],
];

/** Os blocos do Kanban e da Agenda, como uma lista de blocos.
 *
 * ⚠️ Existe para o PADRÃO da prop `blocos` ter um nome: `[[...], [...]]`
 * escrito na assinatura seria a mesma lista repetida, e mudar a do Kanban
 * deixaria a outra para trás. */
export const PERIODOS_DO_KANBAN: readonly (readonly OpcaoDeMenu[])[] = [
  PERIODOS_FUTUROS,
  PERIODOS_PASSADOS,
];
