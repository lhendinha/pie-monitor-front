import { emDias, hojeISO } from "../../../utils";

interface Janela {
  dataDe?: string;
  dataAte?: string;
}

/** Traduz o período escolhido na janela de datas que vai pro servidor.
 *
 * ⚠️ "Todos os períodos" é `null`, NUNCA a string "todos" -- o artifact
 * anota isso porque já foi bug lá: a string virava um filtro de verdade e
 * escondia o quadro inteiro. Aqui `null` devolve janela vazia, que o
 * serviço omite da query.
 *
 * A janela começa HOJE, não no passado: o quadro é sobre o que há pela
 * frente. Tarefa vencida continua aparecendo porque `data_de` fica de fora
 * -- só o fim é limitado.
 */
export function janelaDoPeriodo(dias: number | null): Janela {
  if (dias === null) return {};
  // `dias: 0` é "Hoje", e aí a ponta de cima é o próprio dia.
  return { dataAte: dias === 0 ? hojeISO() : emDias(dias) };
}
