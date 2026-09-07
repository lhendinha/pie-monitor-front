import type { ABAS_DO_FINANCEIRO } from "./constants";

/** Qual das quatro abas da tela -- derivado da lista em `constants`, como o
 * gêmeo em `ClienteDetalhePage`. */
export type AbaDoFinanceiro = (typeof ABAS_DO_FINANCEIRO)[number]["id"];
