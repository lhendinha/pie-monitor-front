import { chamar } from "./client";

interface OpcoesListarHistorico {
  numeroProcesso?: string;
  /** "movimentacao" ou "lembrete". Vazio traz os dois. */
  tipoEnvio?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

/** GET /historico -- depende de contexto de grupo (resolvido no backend
 * pelo próprio token) e pagina de verdade, igual /processos. */
export function listarHistorico(opcoes: OpcoesListarHistorico = {}) {
  const { numeroProcesso, tipoEnvio, pagina, tamanhoPagina } = opcoes;
  const query: Record<string, string | undefined> = numeroProcesso
    ? { numero_processo: numeroProcesso }
    : {
        pagina: pagina ? String(pagina) : undefined,
        tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
        tipo_envio: tipoEnvio || undefined,
      };
  return chamar("/historico", { query });
}
