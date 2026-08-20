import { chamar } from "./client";
import type { TipoOpcaoProcesso } from "../../types";

const RECURSO: Record<TipoOpcaoProcesso, string> = { fase: "/fases", situacao: "/situacoes" };

interface OpcoesListarOpcoesProcesso {
  pagina?: number;
  tamanhoPagina?: number;
}

/** Paginado de verdade. `CamposProcesso` (dropdown de Fase/Situação no
 * processo) pede `tamanhoPagina: 100` pra cobrir a lista inteira. */
export function listarOpcoesProcesso(tipo: TipoOpcaoProcesso, opcoes: OpcoesListarOpcoesProcesso = {}) {
  const { pagina, tamanhoPagina } = opcoes;
  return chamar(RECURSO[tipo], {
    query: { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined },
  });
}

export function criarOpcaoProcesso(tipo: TipoOpcaoProcesso, rotulo: string, ordem: number) {
  return chamar(RECURSO[tipo], { method: "POST", body: { rotulo, ordem } });
}

// `rotulo` opcional -- o reorder por drag-and-drop (`OpcoesLista.reordenarMutation`)
// só reenvia `ordem`, pra não sobrescrever uma edição de rótulo concorrente
// com um valor `opcao.rotulo` já desatualizado (`JSON.stringify` descarta
// chaves `undefined`, então o backend recebe o PATCH parcial de verdade).
export function atualizarOpcaoProcesso(
  tipo: TipoOpcaoProcesso, opcaoId: string, rotulo: string | undefined, ordem: number,
) {
  return chamar(`${RECURSO[tipo]}/${opcaoId}`, { method: "PATCH", body: { rotulo, ordem } });
}

export function desativarOpcaoProcesso(tipo: TipoOpcaoProcesso, opcaoId: string) {
  return chamar(`${RECURSO[tipo]}/${opcaoId}`, { method: "DELETE" });
}

export function reativarOpcaoProcesso(tipo: TipoOpcaoProcesso, opcaoId: string) {
  return chamar(`${RECURSO[tipo]}/${opcaoId}/reativar`, { method: "POST" });
}
