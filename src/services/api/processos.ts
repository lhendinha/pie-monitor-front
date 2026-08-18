import { chamar } from "./client";

interface OpcoesListarProcessos {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

/** GET /processos -- paginado de verdade (backend faz Query por intervalo de
 * sequência, nunca carrega tudo). Se `busca` vier preenchido, ignora
 * pagina/tamanhoPagina -- é uma busca pontual, não paginada. */
export function listarProcessos(opcoes: OpcoesListarProcessos = {}) {
  const { pagina, tamanhoPagina, busca } = opcoes;
  const query: Record<string, string | undefined> = busca
    ? { busca }
    : { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined };
  return chamar("/processos", { query });
}

export function criarProcesso(subgrupoId: string, numeroProcesso: string, apelido: string) {
  return chamar(`/subgrupos/${subgrupoId}/processos`, {
    method: "POST",
    body: { numero_processo: numeroProcesso, apelido },
  });
}

export function atualizarApelidoProcesso(subgrupoId: string, numeroProcesso: string, apelido: string) {
  return chamar(`/subgrupos/${subgrupoId}/processos/${numeroProcesso}`, {
    method: "PATCH",
    body: { apelido },
  });
}

export function removerProcesso(subgrupoId: string, numeroProcesso: string) {
  return chamar(`/subgrupos/${subgrupoId}/processos/${numeroProcesso}`, { method: "DELETE" });
}

export function detalhesProcesso(numeroProcesso: string) {
  return chamar(`/processos/${numeroProcesso}/detalhes`);
}
