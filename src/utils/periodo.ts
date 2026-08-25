import { PERIODO_PERSONALIZADO, PERIODO_TODOS } from "../constants/periodos";
import { emDias, hojeISO } from "./prazo";

import type { IntervaloDeDatas } from "../types";

/** Data local em `aaaa-mm-dd`. Nada de `toISOString()`, que passa por UTC e
 * às 21h em Brasília já devolve o dia seguinte -- mesmo motivo do
 * `hojeISO`. */
function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function hojeComoData(): Date {
  const [a, m, d] = hojeISO().split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** Domingo da semana de `data`, seguindo o artifact
 * (`d.setDate(d.getDate() - d.getDay())`). Domingo é `getDay() === 0`. */
function inicioDaSemana(data: Date): Date {
  const r = new Date(data);
  r.setDate(data.getDate() - data.getDay());
  return r;
}

function somandoDias(data: Date, n: number): Date {
  const r = new Date(data);
  r.setDate(data.getDate() + n);
  return r;
}

/** O intervalo de datas de um período, ou `null` quando não há limite.
 *
 * Porta direta do `periodRange` do artifact, inclusive nas duas pontas. As
 * de mês são de CALENDÁRIO (dia 1 ao último), não "daqui a 30 dias" -- por
 * isso "Este mês" no dia 28 termina em poucos dias, e não no mês que vem.
 *
 * ⚠️ Limita as DUAS pontas, e isso é uma mudança de comportamento
 * deliberada. Antes só o fim era limitado, pra tarefa vencida continuar
 * aparecendo no quadro. Não dá pra manter os dois: "Ontem" e "Últimos 7
 * dias" são períodos PASSADOS, e sem limite inferior eles não filtram nada
 * -- "Ontem" viraria "tudo até ontem". O artifact filtra as duas pontas
 * (`t.date >= range[0] && t.date <= range[1]`), e agora aqui também.
 *
 * Quem quer ver o que está vencido usa "Todos os períodos", ou um passado
 * explícito -- que é justamente o que estas opções novas oferecem.
 */
export function intervaloDoPeriodo(
  id: string,
  personalizado?: IntervaloDeDatas,
): IntervaloDeDatas | null {
  if (id === PERIODO_PERSONALIZADO) return personalizado ?? null;
  const hoje = hojeComoData();

  switch (id) {
    case "hoje":
      return { de: hojeISO(), ate: hojeISO() };
    case "amanha":
      return { de: emDias(1), ate: emDias(1) };
    case "semana": {
      const inicio = inicioDaSemana(hoje);
      return { de: paraIso(inicio), ate: paraIso(somandoDias(inicio, 6)) };
    }
    case "mes": {
      const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      // Dia 0 do mês seguinte é o último dia deste -- resolve 28/29/30/31
      // sem tabela de meses.
      const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return { de: paraIso(primeiro), ate: paraIso(ultimo) };
    }
    case "prox3":
      return { de: hojeISO(), ate: emDias(3) };
    case "proxsemana": {
      const inicio = somandoDias(inicioDaSemana(hoje), 7);
      return { de: paraIso(inicio), ate: paraIso(somandoDias(inicio, 6)) };
    }
    case "proxmes": {
      const primeiro = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
      return { de: paraIso(primeiro), ate: paraIso(ultimo) };
    }
    case "ontem":
      return { de: emDias(-1), ate: emDias(-1) };
    case "ult7":
      return { de: emDias(-7), ate: hojeISO() };
    case "ult30":
      return { de: emDias(-30), ate: hojeISO() };
    // `PERIODO_TODOS` e qualquer id desconhecido caem aqui. Devolver `null`
    // pra id inválido é de propósito: um filtro que ninguém reconhece não
    // pode esconder o quadro inteiro em silêncio.
    case PERIODO_TODOS:
    default:
      return null;
  }
}
