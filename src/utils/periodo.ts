import {
  MAXIMO_DE_MESES_DO_FLUXO,
  PERIODOS_DE_DINHEIRO,
  PERIODO_PERSONALIZADO,
  PERIODO_TODOS,
} from "../constants/periodos";
import { mesDeHoje, mesesEntre, somarMeses } from "./mes";
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
    // ⚠️ Os quatro abaixo são do Financeiro (`PERIODOS_DE_DINHEIRO`), e não
    // aparecem no Kanban. Ficam aqui e não num irmão porque a régua é a
    // mesma -- id vira intervalo --, e duas funções divergiriam no dia em
    // que "Este mês" mudasse de definição num lugar só.
    case "ano": {
      const primeiro = new Date(hoje.getFullYear(), 0, 1);
      const ultimo = new Date(hoje.getFullYear(), 11, 31);
      return { de: paraIso(primeiro), ate: paraIso(ultimo) };
    }
    case "prox7":
      return { de: hojeISO(), ate: emDias(7) };
    case "prox30":
      return { de: hojeISO(), ate: emDias(30) };
    case "mespassado": {
      const primeiro = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimo = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { de: paraIso(primeiro), ate: paraIso(ultimo) };
    }
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

/** O período escolhido em MINÚSCULAS, para caber no meio de uma frase --
 * "A receber · este mês".
 *
 * 🔴 Mora aqui, ao lado de `intervaloDoPeriodo`, e não na página: é
 * tradução de id em palavra, a mesma coisa que este arquivo já faz. E o
 * nome NÃO é `rotuloDoPeriodo`: o projeto já tem dois com esse nome e
 * assinaturas diferentes (o do `SeletorDePeriodo`, que também recebe os
 * blocos, e o da Agenda, que recebe uma data). Um terceiro homônimo faria
 * a próxima pessoa importar o errado.
 *
 * ⚠️ Cai numa frase neutra quando o id não é conhecido: o card diz "de
 * quando" ele fala, e um card sem essa metade é um número solto.
 */
export function periodoPorExtenso(periodoId: string): string {
  if (periodoId === PERIODO_TODOS) return "todos os períodos";
  const achado = PERIODOS_DE_DINHEIRO.flat().find((o) => o.id === periodoId);
  return achado ? achado.rotulo.toLowerCase() : "o período escolhido";
}

/** O período do FLUXO DE CAIXA, em MESES (`aaaa-mm`).
 *
 * 🔴 Função própria, e não um `case` a mais em `intervaloDoPeriodo`: aquela
 * devolve DIAS, e as duas unidades no mesmo retorno seriam duas verdades
 * sobre o mesmo tipo -- quem chamasse errado mandaria `2026-09-01` onde o
 * servidor espera `2026-09` e receberia um 400 sobre um campo que a tela
 * nunca mostrou.
 *
 * ⚠️ "Últimos 6 meses" INCLUI o mês corrente: seis colunas terminando em
 * hoje. Sem incluir, o relatório aberto no dia 1º não mostraria nada do mês
 * que está correndo.
 */
export function intervaloEmMeses(
  id: string,
  personalizado?: IntervaloDeDatas,
): IntervaloDeDatas | null {
  if (id === PERIODO_PERSONALIZADO) return personalizado ?? null;
  const hoje = mesDeHoje();
  const ano = hoje.slice(0, 4);

  switch (id) {
    case "esteano":
      return { de: `${ano}-01`, ate: `${ano}-12` };
    case "anopassado": {
      const passado = Number(ano) - 1;
      return { de: `${passado}-01`, ate: `${passado}-12` };
    }
    case "ult6meses":
      return { de: somarMeses(hoje, -5), ate: hoje };
    case "ult12meses":
      return { de: somarMeses(hoje, -11), ate: hoje };
    case "prox6meses":
      return { de: hoje, ate: somarMeses(hoje, 5) };
    case "prox12meses":
      return { de: hoje, ate: somarMeses(hoje, 11) };
    default:
      return null;
  }
}

/** O que há de errado com o período escolhido -- vazio quando está bom.
 *
 * 🔴 A tela recusa ANTES de pedir: as duas regras são as do servidor
 * (`fluxo_de_caixa.garantir_meses`), e ir buscar um 400 para descobrir o que
 * a tela já sabe transforma uma correção em "Não foi possível carregar".
 */
export function erroDoPeriodoEmMeses(intervalo: IntervaloDeDatas | null): string {
  if (!intervalo?.de || !intervalo?.ate) return "";
  if (intervalo.de > intervalo.ate) return "O mês final vem antes do inicial.";
  const quantos = mesesEntre(intervalo.de, intervalo.ate);
  if (quantos > MAXIMO_DE_MESES_DO_FLUXO) {
    return `O período tem ${quantos} meses; o máximo é ${MAXIMO_DE_MESES_DO_FLUXO}.`;
  }
  return "";
}
