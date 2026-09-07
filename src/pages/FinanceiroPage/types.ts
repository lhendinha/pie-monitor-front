import type { IntervaloDeDatas } from "../../types";
import type { ABAS_DO_FINANCEIRO } from "./constants";

/** Qual das quatro abas da tela -- derivado da lista em `constants`, como o
 * gêmeo em `ClienteDetalhePage`. */
export type AbaDoFinanceiro = (typeof ABAS_DO_FINANCEIRO)[number]["id"];

/** O que a barra de filtros da lista de lançamentos guarda.
 *
 * ⚠️ Tudo vazio = sem filtro, que é o que o servidor entende quando o
 * parâmetro não vai. Um id inventado para "todos" viraria um `?tipo=todos`
 * que não casa com lançamento nenhum.
 *
 * 🔴 `departamentoIds` é o RATEIO, não o subgrupo do vínculo: a pergunta que
 * ele faz ao servidor é "tem parcela para X". Com ele, a lista mostra o
 * pedaço e os cards somam o pedaço.
 */
export interface FiltrosDaListaDeLancamentos {
  periodoId: string;
  intervaloPersonalizado?: IntervaloDeDatas;
  tipo: string;
  situacao: string;
  contaId: string;
  departamentoIds: string[];
  /** O nome de cada departamento escolhido, para ele não sumir do próprio
   * valor quando estiver fora da primeira página da busca. */
  departamentoNomes: Record<string, string>;
  busca: string;
}
