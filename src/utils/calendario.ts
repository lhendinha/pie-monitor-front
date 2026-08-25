/** Monta a grade de um mês: sempre 6 semanas × 7 dias.
 *
 * Seis semanas fixas, mesmo quando o mês cabe em cinco: com número variável
 * de linhas o popover muda de altura ao navegar entre meses, e o calendário
 * "pula" debaixo do cursor.
 *
 * Os dias de fora do mês vêm marcados (`doMes: false`) em vez de omitidos --
 * a grade precisa começar no domingo certo, e buraco no início desalinharia
 * as colunas.
 */
import type { DiaDoCalendario } from "../types";

/** `aaaa-mm-dd` no fuso LOCAL. `toISOString()` converteria pra UTC e, à
 * noite no Brasil, devolveria o dia seguinte. */
export function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function gradeDoMes(ano: number, mes: number): DiaDoCalendario[] {
  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    return { iso: paraIso(d), dia: d.getDate(), doMes: d.getMonth() === mes };
  });
}
