import { chamar } from "./client";

interface OpcoesListarProcessos {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

/** Campos novos do processo, todos opcionais -- mesmo conjunto usado no
 * cadastro (`criarProcesso`) e na edição (`atualizarProcesso`). Nome
 * `Opcionais` de propósito -- evita colidir com o componente React
 * `CamposProcesso.tsx` (campos compartilhados entre cadastro e edição). */
export interface CamposOpcionaisProcesso {
  clienteIds?: string[];
  objetoAssunto?: string;
  proximaProvidencia?: string;
  dataVerificar?: string;
  prazoFinal?: string;
  observacoes?: string;
  faseId?: string;
  situacaoId?: string;
}

function corpoCamposOpcionais(campos: CamposOpcionaisProcesso = {}) {
  return {
    cliente_ids: campos.clienteIds || [],
    objeto_assunto: campos.objetoAssunto || "",
    proxima_providencia: campos.proximaProvidencia || "",
    data_verificar: campos.dataVerificar || "",
    prazo_final: campos.prazoFinal || "",
    observacoes: campos.observacoes || "",
    fase_id: campos.faseId || "",
    situacao_id: campos.situacaoId || "",
  };
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

export function criarProcesso(
  subgrupoId: string, numeroProcesso: string, apelido: string, campos: CamposOpcionaisProcesso = {}
) {
  return chamar(`/subgrupos/${subgrupoId}/processos`, {
    method: "POST",
    body: { numero_processo: numeroProcesso, apelido, ...corpoCamposOpcionais(campos) },
  });
}

export function atualizarProcesso(
  subgrupoId: string, numeroProcesso: string, apelido: string, campos: CamposOpcionaisProcesso = {}
) {
  return chamar(`/subgrupos/${subgrupoId}/processos/${numeroProcesso}`, {
    method: "PATCH",
    body: { apelido, ...corpoCamposOpcionais(campos) },
  });
}

export function removerProcesso(subgrupoId: string, numeroProcesso: string) {
  return chamar(`/subgrupos/${subgrupoId}/processos/${numeroProcesso}`, { method: "DELETE" });
}

export function detalhesProcesso(numeroProcesso: string) {
  return chamar(`/processos/${numeroProcesso}/detalhes`);
}
