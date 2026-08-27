import { chamar } from "./client";
import { corpoDosCamposDeProcesso } from "../../utils/processos";
import type { CamposOpcionaisProcesso, FiltrosBuscaProcessos, OpcoesListarProcessos } from "../../types";

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
      f.prazoFinalAte ||
      f.responsavelId ||
      f.semResponsavel,
  );
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
  const {
    pagina, tamanhoPagina, busca, clienteId, faseIds, situacaoIds,
    dataVerificarAte, prazoFinalAte, responsavelId, semResponsavel,
  } = opcoes;
  return chamar("/processos", {
    query: {
      busca,
      cliente_id: clienteId,
      // Repetidos: `?fase_id=a&fase_id=b`. Ver `montarQuery`.
      fase_id: faseIds,
      situacao_id: situacaoIds,
      data_verificar_ate: dataVerificarAte,
      prazo_final_ate: prazoFinalAte,
      responsavel_id: responsavelId,
      // 🔴 Booleano PRÓPRIO, e não um valor mágico dentro de `responsavel_id`.
      //
      // `montarQuery` descarta valor vazio, e no servidor `""` já significa
      // "não filtrar". "Sem responsável" pedido como string vazia nem sairia
      // daqui -- a tela mostraria a lista inteira parecendo filtrada.
      //
      // ⚠️ `undefined` quando falso, pelo mesmo motivo: `sem_responsavel=false`
      // na URL seria ruído, e o servidor já trata a ausência como falso.
      sem_responsavel: semResponsavel ? "true" : undefined,
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
    body: { numero_processo: numeroProcesso, apelido, ...corpoDosCamposDeProcesso(campos) },
  });
}

export function atualizarProcesso(
  subgrupoId: string, numeroProcesso: string, apelido: string, campos: CamposOpcionaisProcesso = {}
) {
  return chamar(`/subgrupos/${subgrupoId}/processos/${numeroProcesso}`, {
    method: "PATCH",
    body: { apelido, ...corpoDosCamposDeProcesso(campos) },
  });
}

export function removerProcesso(subgrupoId: string, numeroProcesso: string) {
  return chamar(`/subgrupos/${subgrupoId}/processos/${numeroProcesso}`, { method: "DELETE" });
}

export function detalhesProcesso(numeroProcesso: string) {
  return chamar(`/processos/${numeroProcesso}/detalhes`);
}
