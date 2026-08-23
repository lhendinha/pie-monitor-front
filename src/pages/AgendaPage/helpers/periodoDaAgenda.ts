import { gradeDoMes, paraIso } from "../../../utils/calendario";
import type { Intervalo } from "../../../utils/periodo";
import type { VisaoDaAgenda } from "../types";

/** Datas e rótulos das quatro visões da Agenda.
 *
 * Tudo em cima de `Date` LOCAL e `paraIso` -- nunca `toISOString()`, que
 * converte pra UTC e, à noite no Brasil, devolve o dia seguinte. A Agenda
 * inteira compara `aaaa-mm-dd` com o campo `data` da tarefa, que também é
 * dia sem hora; um deslize de fuso jogaria a tarefa pro dia errado.
 */

/** Domingo da semana de `data` -- é onde o artifact começa a semana, e a
 * grade do mês (`gradeDoMes`) usa a mesma convenção. */
export function inicioDaSemana(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() - data.getDay());
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

/** Quantos dias a visão em lista cobre. */
export const DIAS_DA_LISTA = 14;

/** O intervalo que a visão precisa TER EM MÃOS -- é o que vai pro servidor
 * como `data_de`/`data_ate`.
 *
 * ⚠️ No mês é a grade de 42 dias, não o mês: as células de fora do mês
 * mostram os pontinhos das tarefas delas, e pedir só de 01 a 31 deixaria
 * essas células silenciosamente vazias.
 */
export function intervaloDaVisao(visao: VisaoDaAgenda, data: Date): Intervalo {
  if (visao === "dia") {
    const iso = paraIso(data);
    return { de: iso, ate: iso };
  }
  if (visao === "semana") {
    const inicio = inicioDaSemana(data);
    return { de: paraIso(inicio), ate: paraIso(somarDias(inicio, 6)) };
  }
  if (visao === "lista") {
    return { de: paraIso(data), ate: paraIso(somarDias(data, DIAS_DA_LISTA - 1)) };
  }
  const grade = gradeDoMes(data.getFullYear(), data.getMonth());
  return { de: grade[0].iso, ate: grade[grade.length - 1].iso };
}

/** Um passo de navegação: mês a mês, semana a semana, dia a dia.
 *
 * A lista anda de dia em dia (como no artifact) -- ela é uma janela
 * deslizante de 14 dias, não uma página fixa de duas semanas.
 */
export function navegar(visao: VisaoDaAgenda, data: Date, passo: number): Date {
  if (visao === "mes") {
    /* Dia 1 de propósito: `setMonth` sobre um dia 31 "transborda" pro mês
       seguinte (31/03 -> 31/02 -> 03/03), e navegar de mês em mês pularia
       meses inteiros. A Agenda só usa o mês/ano nessa visão. */
    return new Date(data.getFullYear(), data.getMonth() + passo, 1);
  }
  if (visao === "semana") return somarDias(data, 7 * passo);
  return somarDias(data, passo);
}

const FORMATO_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const FORMATO_DIA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

/** Só a PRIMEIRA letra.
 *
 * ⚠️ `text-transform: capitalize` do CSS não serve aqui: ele capitaliza
 * cada palavra, e o Intl devolve "agosto de 2026" / "quarta-feira, 19 de
 * agosto" -- viravam "Agosto De 2026" e "Quarta-Feira, 19 De Agosto", que
 * não é português. */
function comInicialMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function diaEMes(data: Date): string {
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/** O que a barra de datas mostra ao lado das setas. */
export function rotuloDoPeriodo(visao: VisaoDaAgenda, data: Date): string {
  if (visao === "mes") return comInicialMaiuscula(FORMATO_MES.format(data));
  if (visao === "semana") {
    const inicio = inicioDaSemana(data);
    return `${diaEMes(inicio)} – ${diaEMes(somarDias(inicio, 6))}`;
  }
  if (visao === "lista") return `Próximos ${DIAS_DA_LISTA} dias a partir de ${diaEMes(data)}`;
  return comInicialMaiuscula(FORMATO_DIA.format(data));
}

/** Rótulo de um dia dentro das listas ("segunda-feira, 24 de agosto"). */
export function rotuloDoDia(data: Date): string {
  return comInicialMaiuscula(FORMATO_DIA.format(data));
}

/** A data que o formulário assume ao criar tarefa a partir da Agenda.
 *
 * Nas visões de intervalo, se HOJE cai dentro do que está à vista, hoje
 * ganha -- é o que a pessoa espera ao clicar "Nova tarefa" olhando pro mês
 * corrente. Fora disso, a primeira data visível: criar uma tarefa com data
 * que não aparece na tela em que ela foi criada é o pior dos dois.
 */
export function dataPadraoDaNovaTarefa(visao: VisaoDaAgenda, data: Date, hoje: Date): string {
  const isoHoje = paraIso(hoje);
  const { de, ate } = intervaloDaVisao(visao, data);
  if (visao === "dia") return de;
  return isoHoje >= de && isoHoje <= ate ? isoHoje : de;
}
