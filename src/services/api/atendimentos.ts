import { chamar } from "./client";

interface OpcoesListarAtendimentos {
  busca?: string;
  status?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

/** `GET /atendimentos`, escopado aos subgrupos que a pessoa enxerga.
 *
 * A busca vai pro SERVIDOR (`busca`), diferente do Kanban -- aqui a rota
 * tem o parâmetro, então peneirar no cliente esconderia atendimento que
 * está na página seguinte.
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

export function detalhesAtendimento(subgrupoId: string, atendimentoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}`);
}

export function criarAtendimento(dados: {
  subgrupo_id: string;
  assunto: string;
  cliente_ids: string[];
  primeiro_registro: string;
  processo_numero?: string | null;
}) {
  return chamar("/atendimentos", { method: "POST", body: { ...dados } });
}

/** PATCH parcial: campo omitido não é tocado. */
export function atualizarAtendimento(
  subgrupoId: string,
  atendimentoId: string,
  campos: {
    assunto?: string;
    status?: string;
    cliente_ids?: string[];
    processo_numero?: string | null;
  },
) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}`, {
    method: "PATCH",
    body: { ...campos },
  });
}

/** O registro é ACRESCENTADO -- a linha do tempo não se edita nem se apaga.
 * É registro de atendimento a cliente: reescrever o passado é justamente o
 * que ele não pode permitir. */
export function adicionarRegistro(subgrupoId: string, atendimentoId: string, texto: string) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}/registros`, {
    method: "POST",
    body: { texto },
  });
}

export function removerAtendimento(subgrupoId: string, atendimentoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}`, { method: "DELETE" });
}
