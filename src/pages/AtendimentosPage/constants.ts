/** O filtro de status da barra (`AT_STATUS_OPTIONS` do artifact).
 *
 * ⚠️ "Todos" é `"todos"`, e NÃO `""`: o `PilulaDeMenu` avisa que item de
 * menu com `value=""` o zag não registra -- a opção simplesmente não
 * seleciona. A conversão pro que o servidor espera (parâmetro ausente) é
 * feita por `statusParaApi`, num lugar só.
 */
export const STATUS_TODOS = "todos";

export const OPCOES_DE_STATUS = [
  { id: STATUS_TODOS, rotulo: "Todos" },
  { id: "Em andamento", rotulo: "Em andamento" },
  { id: "Fechado", rotulo: "Fechados" },
] as const;

/** `undefined` some da query string (ver `montarQuery`), que é como o
 * servidor entende "sem filtro". */
export function statusParaApi(status: string): string | undefined {
  return status === STATUS_TODOS ? undefined : status;
}
