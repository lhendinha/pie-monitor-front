import { chamar } from "./client";

/** Parâmetros de busca do `GET /processos`.
 *
 * Nome diferente do `FiltrosProcessos` de `types/` de propósito: aquele é o
 * ESTADO da tela, este é o que vai na query string. Chamar os dois igual
 * fazia o import errado passar despercebido. */
export interface FiltrosBuscaProcessos {
  busca?: string;
  clienteId?: string;
  faseIds?: string[];
  situacaoIds?: string[];
  dataVerificarAte?: string;
  prazoFinalAte?: string;
}

interface OpcoesListarProcessos extends FiltrosBuscaProcessos {
  pagina?: number;
  tamanhoPagina?: number;
}

/** true se qualquer filtro estiver preenchido -- mesma checagem que o
 * backend usa (processos_router.py) pra decidir entre listagem paginada
 * por contador e busca/filtro (não paginado, ver `listarProcessos`). */
export function temFiltroAtivo(f: FiltrosBuscaProcessos): boolean {
  return Boolean(
    f.busca ||
      f.clienteId ||
      f.faseIds?.length ||
      f.situacaoIds?.length ||
      f.dataVerificarAte ||
      f.prazoFinalAte,
  );
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

/** GET /processos -- paginado de verdade, COM ou SEM filtro.
 *
 * 🔴 A paginação era descartada quando havia filtro. O backend mudou na
 * Fase 1a -- o comentário dele diz "busca/filtro agora pagina igual à
 * listagem sem filtro: antes devolvia o resultado inteiro num payload só, e
 * o front tinha que esconder a paginação" -- e o front não acompanhou.
 *
 * Resultado: filtrar por uma situação com 40 processos mostrava 10, a
 * contagem dizia 40, e não havia barra de páginas nem seletor de "Por
 * página". Os outros 30 eram inalcançáveis.
 */
export function listarProcessos(opcoes: OpcoesListarProcessos = {}) {
  const { pagina, tamanhoPagina, busca, clienteId, faseIds, situacaoIds, dataVerificarAte, prazoFinalAte } = opcoes;
  return chamar("/processos", {
    query: {
      busca,
      cliente_id: clienteId,
      // Repetidos: `?fase_id=a&fase_id=b`. Ver `montarQuery`.
      fase_id: faseIds,
      situacao_id: situacaoIds,
      data_verificar_ate: dataVerificarAte,
      prazo_final_ate: prazoFinalAte,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
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
