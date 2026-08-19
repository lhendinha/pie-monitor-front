import { chamar } from "./client";

interface OpcoesListarSubgrupos {
  pagina?: number;
  tamanhoPagina?: number;
}

/** GET /subgrupos -- paginado de verdade (mesmo mecanismo de /processos e
 * /historico). Quem precisa da lista inteira pra popular um seletor (ex.:
 * MembrosPage, ProcessosPage, ConvidarPage) pede `tamanhoPagina: 100`
 * (teto já usado pelo resto do app) em vez de paginar de verdade. */
export function listarSubgrupos(opcoes: OpcoesListarSubgrupos = {}) {
  const { pagina, tamanhoPagina } = opcoes;
  return chamar("/subgrupos", {
    query: { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined },
  });
}

export function criarSubgrupo(nome: string) {
  return chamar("/subgrupos", { method: "POST", body: { nome } });
}

export function removerSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}`, { method: "DELETE" });
}
