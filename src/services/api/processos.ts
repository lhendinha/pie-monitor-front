import { chamar } from "./client";

export interface FiltrosProcessos {
  busca?: string;
  clienteId?: string;
  faseId?: string;
  situacaoId?: string;
  dataVerificarAte?: string;
  prazoFinalAte?: string;
}

interface OpcoesListarProcessos extends FiltrosProcessos {
  pagina?: number;
  tamanhoPagina?: number;
}

/** true se qualquer filtro estiver preenchido -- mesma checagem que o
 * backend usa (processos_router.py) pra decidir entre listagem paginada
 * por contador e busca/filtro (não paginado, ver `listarProcessos`). */
export function temFiltroAtivo(f: FiltrosProcessos): boolean {
  return Boolean(f.busca || f.clienteId || f.faseId || f.situacaoId || f.dataVerificarAte || f.prazoFinalAte);
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
 * sequência, nunca carrega tudo). Se qualquer filtro vier preenchido
 * (`temFiltroAtivo`), ignora pagina/tamanhoPagina -- é uma busca/filtro
 * pontual, não paginado (mesmo corte que processos_router.py usa). */
export function listarProcessos(opcoes: OpcoesListarProcessos = {}) {
  const { pagina, tamanhoPagina, busca, clienteId, faseId, situacaoId, dataVerificarAte, prazoFinalAte } = opcoes;
  const query: Record<string, string | undefined> = temFiltroAtivo(opcoes)
    ? {
        busca,
        cliente_id: clienteId,
        fase_id: faseId,
        situacao_id: situacaoId,
        data_verificar_ate: dataVerificarAte,
        prazo_final_ate: prazoFinalAte,
      }
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
