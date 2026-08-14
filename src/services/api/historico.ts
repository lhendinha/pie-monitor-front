import { chamar, comGrupoAlvo } from "./client";

interface OpcoesListarHistorico {
  numeroProcesso?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

/** GET /historico -- agora depende de contexto de grupo (achado de escopo
 * corrigido no backend) e pagina de verdade, igual /processos. */
export function listarHistorico(opcoes: OpcoesListarHistorico = {}, grupoIdAlvo?: string) {
  const { numeroProcesso, pagina, tamanhoPagina } = opcoes;
  const query: Record<string, string | undefined> = numeroProcesso
    ? { numero_processo: numeroProcesso }
    : { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined };
  return chamar("/historico", comGrupoAlvo({ query }, grupoIdAlvo));
}
