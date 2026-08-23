import { chamar } from "./client";

interface OpcoesListarAtendimentos {
  busca?: string;
  status?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

/** `GET /atendimentos`, escopado aos subgrupos que a pessoa enxerga.
 *
 * Por enquanto o único consumidor é o campo de vínculo da tarefa -- a tela
 * de Atendimentos ainda não existe. Nasce aqui, e não dentro do Kanban,
 * porque chamada de API mora em `services/api` como todas as outras.
 */
export function listarAtendimentos(opcoes: OpcoesListarAtendimentos = {}) {
  const { busca, status, pagina, tamanhoPagina } = opcoes;
  return chamar("/atendimentos", {
    query: {
      busca,
      status,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}
