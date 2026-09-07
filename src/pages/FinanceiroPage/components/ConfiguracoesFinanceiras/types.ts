import type { SECOES_DO_CATALOGO } from "./constants";

/** Qual das três listas está à mostra -- derivado da lista em `constants`,
 * como as abas da página. */
export type SecaoDoCatalogo = (typeof SECOES_DO_CATALOGO)[number]["id"];
