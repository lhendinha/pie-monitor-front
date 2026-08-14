import { chamar, comGrupoAlvo } from "./client";

interface OpcoesListarProcessos {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

/** GET /processos -- paginado de verdade (backend faz Query por intervalo de
 * sequência, nunca carrega tudo). Se `busca` vier preenchido, ignora
 * pagina/tamanhoPagina -- é uma busca pontual, não paginada. */
export function listarProcessos(opcoes: OpcoesListarProcessos = {}, grupoIdAlvo?: string) {
  const { pagina, tamanhoPagina, busca } = opcoes;
  const query: Record<string, string | undefined> = busca
    ? { busca }
    : { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined };
  return chamar("/processos", comGrupoAlvo({ query }, grupoIdAlvo));
}

export function criarProcesso(
  subgrupoId: string,
  numeroProcesso: string,
  apelido: string,
  grupoIdAlvo?: string
) {
  return chamar(
    `/subgrupos/${subgrupoId}/processos`,
    comGrupoAlvo({ method: "POST", body: { numero_processo: numeroProcesso, apelido } }, grupoIdAlvo)
  );
}

export function removerProcesso(subgrupoId: string, numeroProcesso: string, grupoIdAlvo?: string) {
  return chamar(
    `/subgrupos/${subgrupoId}/processos/${numeroProcesso}`,
    comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo)
  );
}

export function detalhesProcesso(numeroProcesso: string, grupoIdAlvo?: string) {
  return chamar(`/processos/${numeroProcesso}/detalhes`, comGrupoAlvo({}, grupoIdAlvo));
}
