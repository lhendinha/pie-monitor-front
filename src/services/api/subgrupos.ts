import { chamar } from "./client";

interface OpcoesListarSubgrupos {
  pagina?: number;
  tamanhoPagina?: number;
  /** Filtra por nome no SERVIDOR, sem acento e sem caixa
   * (`subgrupos_service.listar_pagina`). É o que permite a pílula trazer a
   * primeira página e completar por digitação, em vez de baixar a lista
   * inteira pra filtrar aqui. */
  busca?: string;
}

/** GET /subgrupos -- paginado de verdade (mesmo mecanismo de /processos e
 * /historico), em ordem alfabética e com filtro por nome.
 *
 * ⚠️ O recorte de ESCOPO vem antes do filtro de texto no servidor: quem só
 * vê dois subgrupos busca dentro dos dois, nunca no grupo inteiro. */
export function listarSubgrupos(opcoes: OpcoesListarSubgrupos = {}) {
  const { pagina, tamanhoPagina, busca } = opcoes;
  return chamar("/subgrupos", {
    query: {
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
      busca: busca || undefined,
    },
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
