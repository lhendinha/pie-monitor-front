import { chamar } from "./client";
import type { OpcoesListarHistorico } from "../../types";

/** GET /historico -- depende de contexto de grupo (resolvido no backend
 * pelo próprio token) e pagina de verdade, igual /processos. */
export function listarHistorico(opcoes: OpcoesListarHistorico = {}) {
  const { numeroProcesso, tipoEnvio, apenasComFalha, dias, pagina, tamanhoPagina } = opcoes;
  /* ⚠️ Com `numeroProcesso` vai SÓ ele. O servidor ignora os outros nesse
     ramo (partição própria, sem paginação, feito pro link do e-mail), e
     mandá-los daria a impressão de filtro aplicado. */
  const query: Record<string, string | undefined> = numeroProcesso
    ? { numero_processo: numeroProcesso }
    : {
        pagina: pagina ? String(pagina) : undefined,
        tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
        tipo_envio: tipoEnvio || undefined,
        // Mesmo formato de `sem_responsavel` em /tarefas: string "true", e
        // `undefined` some da query string.
        apenas_com_falha: apenasComFalha ? "true" : undefined,
        dias: dias ? String(dias) : undefined,
      };
  return chamar("/historico", { query });
}
