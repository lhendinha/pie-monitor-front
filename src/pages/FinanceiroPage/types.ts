import type {
  TIPO_ENTRADA,
  TIPO_HONORARIO,
  TIPO_SAIDA,
  TIPO_TRANSFERENCIA,
} from "../../constants";
import type { IntervaloDeDatas } from "../../types";
import type { ABAS_DO_FINANCEIRO, SECOES_DE_FATURAS } from "./constants";

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
  /** `entrada` ou `saida` -- o recorte dos CARDS.
   *
   * 🔴 Separado de `tipo` de propósito: a pílula de tipo oferece os quatro
   * tipos (honorário, entrada, saída, transferência), e "a receber" não é
   * nenhum deles -- é a natureza, que junta honorário e entrada. */
  natureza: string;
  situacao: string;
  contaId: string;
  departamentoIds: string[];
  /** O nome de cada departamento escolhido, para ele não sumir do próprio
   * valor quando estiver fora da primeira página da busca. */
  departamentoNomes: Record<string, string>;
  busca: string;
  /** "O que vence nos próximos N dias, atrasados INCLUSIVE" -- zero é
   * desligado.
   *
   * 🔴 Existe para o clique da Área de trabalho abrir exatamente a lista que
   * gerou o número. "A pagar até 7 dias" soma sem limite inferior (o atrasado
   * de julho continua a pagar), e nenhuma combinação de período e situação
   * expressa isso: `situacao` oferece aberto OU atrasado, e o período tem as
   * duas pontas. Sem este filtro, o card diria um número e a lista abriria
   * outro -- que é o defeito de que `resumo_service` inteiro se protege.
   *
   * ⚠️ Ele SUBSTITUI o recorte por período do lado do servidor (a rota troca
   * a Query do vencimento pela do índice esparso dos abertos), e por isso a
   * tela precisa dizer que está ligado -- ver a pílula em
   * `FiltrosDeLancamentos`. */
  vencendo: number;
}

/** Qual dos quatro formulários de lançamento está aberto -- ou nenhum.
 *
 * ⚠️ São os mesmos quatro `tipo` da API (`TIPO_HONORARIO` e irmãos), e não
 * um vocabulário paralelo: a porta escolhida no menu É o tipo do lançamento
 * que vai nascer. */
export type FormaDeLancamento =
  | typeof TIPO_HONORARIO
  | typeof TIPO_ENTRADA
  | typeof TIPO_SAIDA
  | typeof TIPO_TRANSFERENCIA;

/** Qual das duas seções da aba Faturas está na tela. */
export type SecaoDeFaturas = (typeof SECOES_DE_FATURAS)[number]["id"];
