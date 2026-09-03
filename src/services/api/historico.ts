import { chamar } from "./client";
import type { OpcoesListarHistorico } from "../../types";

/** GET /historico -- depende de contexto de grupo (resolvido no backend
 * pelo próprio token) e pagina de verdade, igual /processos. */
export function listarHistorico(opcoes: OpcoesListarHistorico = {}) {
  const { numeroProcesso, subgrupoId, tipoEnvio, apenasComFalha, dias, pagina, tamanhoPagina } =
    opcoes;
  /* 🔴 O `numeroProcesso` vai JUNTO com os outros (03/09/2026).
   *
   * Antes ele ia sozinho, porque o servidor desviava para um ramo próprio --
   * sem paginação e ignorando o resto. Esse ramo virou rota separada
   * (`historicoDoProcesso`), e aqui o número é um filtro como os demais: quem
   * escolheu "Cível" e "últimos 7 dias" e digita um número continua com os
   * três valendo. */
  return chamar("/historico", {
    query: {
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
      numero_processo: numeroProcesso || undefined,
      subgrupo_id: subgrupoId || undefined,
      tipo_envio: tipoEnvio || undefined,
      // Mesmo formato de `sem_responsavel` em /tarefas: string "true", e
      // `undefined` some da query string.
      apenas_com_falha: apenasComFalha ? "true" : undefined,
      dias: dias ? String(dias) : undefined,
    },
  });
}

/** `GET /historico/{numero}` -- todo o histórico de UM processo, sem paginar.
 *
 * 🔴 Existe para o link que chega por e-mail. Ele traz `?processo=` e
 * `?comunicacao=`, e o front precisa achar a notificação daquele
 * `comunicacao_id` no conjunto INTEIRO -- procurar numa página devolveria
 * "não encontrei" para algo que está na página seguinte.
 *
 * ⚠️ Por isso NÃO é `listarHistorico({ numeroProcesso })`: aquela pagina. As
 * duas existem de propósito, e são recursos diferentes no servidor. */
export function historicoDoProcesso(numeroProcesso: string) {
  return chamar(`/historico/${encodeURIComponent(numeroProcesso)}`);
}
