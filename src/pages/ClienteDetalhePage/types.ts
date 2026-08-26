import type { ABAS_DO_CLIENTE } from "./constants";

/** Qual das três abas da tela -- derivado da lista em `constants`, como o
 * gêmeo em `ProcessoDetalhePage`. */
export type AbaDoCliente = (typeof ABAS_DO_CLIENTE)[number]["id"];
