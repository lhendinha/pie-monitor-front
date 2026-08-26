import type { ABAS_DO_ATENDIMENTO } from "./constants";

/** Qual das duas abas da tela.
 *
 * Derivado da lista em `constants`, e não escrito à mão: acrescentar uma aba
 * lá passa a ser um erro de compilação em todo lugar que não a trata. Uma
 * união digitada à parte aceitaria calada a aba que ninguém desenhou.
 */
export type AbaDoAtendimento = (typeof ABAS_DO_ATENDIMENTO)[number]["id"];
