/** O pacote de tipos de alcance global, um arquivo por domínio.
 *
 * Este índice só reexporta: quem importa continua escrevendo
 * `from "../types"`, e quem declara escolhe o arquivo pelo domínio, não
 * pela ordem de chegada. É a única pasta de tipos com índice -- ver a
 * regra 1 da seção 3 do `CONTEXT.md`.
 *
 * ➡️ `tiposDoPacote.test.ts` afirma que só há reexport aqui, que não há
 * ciclo entre os arquivos e que o total de tipos é o esperado.
 */
export type * from "./api";
export type * from "./atendimento";
export type * from "./cliente";
export type * from "./documento";
export type * from "./grupo";
export type * from "./notificacao";
export type * from "./processo";
export type * from "./sessao";
export type * from "./tarefa";
export type * from "./ui";
export type * from "./url";
