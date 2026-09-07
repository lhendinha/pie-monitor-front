import {
  STATUS_EM_ANDAMENTO,
  STATUS_FECHADO,
} from "../../constants";

/** O filtro de status da barra (`AT_STATUS_OPTIONS` do artifact).
 *
 * ⚠️ "Todos" é `"todos"`, e NÃO `""`: o `PilulaDeMenu` avisa que item de
 * menu com `value=""` o zag não registra -- a opção simplesmente não
 * seleciona. A conversão pro que o servidor espera (parâmetro ausente) é
 * feita por `statusParaApi`, num lugar só.
 *
 * ⚠️ Este fica AQUI, e os outros dois não: "todos" é uma opção de MENU, que
 * só existe nesta tela. "Em andamento" e "Fechado" são o vocabulário do
 * servidor, e moram em `constants/atendimento.ts`.
 */
export const STATUS_TODOS = "todos";

/** As três opções da barra: o filtro de tela primeiro, depois os dois
 * status de verdade.
 *
 * ⚠️ `rotulo` é livre e o `id` não é: "Fechados" no plural é escolha de
 * texto, enquanto `STATUS_FECHADO` é a palavra que vai para a API. Ficaram
 * lado a lado de propósito, para a diferença ser visível. */
export const OPCOES_DE_STATUS = [
  { id: STATUS_TODOS, rotulo: "Todos" },
  { id: STATUS_EM_ANDAMENTO, rotulo: "Em andamento" },
  { id: STATUS_FECHADO, rotulo: "Fechados" },
] as const;

/** `undefined` some da query string (ver `montarQuery`), que é como o
 * servidor entende "sem filtro". */
export function statusParaApi(status: string): string | undefined {
  return status === STATUS_TODOS ? undefined : status;
}
