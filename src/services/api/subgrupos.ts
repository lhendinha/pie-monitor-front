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

export function atualizarSubgrupo(subgrupoId: string, nome: string) {
  return chamar(`/subgrupos/${subgrupoId}`, { method: "PATCH", body: { nome } });
}

export function removerSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}`, { method: "DELETE" });
}

/** GET /subgrupos/{id}/conteudo -- o que ainda existe dentro do subgrupo.
 *
 * A tela pergunta ANTES de confirmar a exclusão: sem isso ela só
 * descobriria os impedimentos depois de mandar o DELETE e tomar 409, ou
 * seja, depois de perguntar "tem certeza?" pra uma exclusão que nunca ia
 * acontecer. */
export function conteudoDoSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/conteudo`);
}
