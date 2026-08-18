import { chamar } from "./client";

interface OpcoesListarHistorico {
  numeroProcesso?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

/** GET /historico -- depende de contexto de grupo (resolvido no backend
 * pelo próprio token) e pagina de verdade, igual /processos. */
export function listarHistorico(opcoes: OpcoesListarHistorico = {}) {
  const { numeroProcesso, pagina, tamanhoPagina } = opcoes;
  const query: Record<string, string | undefined> = numeroProcesso
    ? { numero_processo: numeroProcesso }
    : { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined };
  return chamar("/historico", { query });
}
