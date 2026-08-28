import { chamar } from "./client";
import type { OpcoesListarAtendimentos, ResumoDeAtendimento } from "../../types";

/** `GET /atendimentos`, escopado aos subgrupos que a pessoa enxerga.
 *
 * A busca vai pro SERVIDOR (`busca`), diferente do Kanban -- aqui a rota
 * tem o parâmetro, então peneirar no cliente esconderia atendimento que
 * está na página seguinte.
 */
export function listarAtendimentos(opcoes: OpcoesListarAtendimentos = {}) {
  const { busca, status, subgrupoId, pagina, tamanhoPagina } = opcoes;
  return chamar("/atendimentos", {
    query: {
      busca,
      status,
      subgrupo_id: subgrupoId,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

/** Assunto de vários atendimentos de uma vez.
 *
 * 🔴 Serve a Agenda, que rotula tarefa vinculada. Antes ela pedia o catálogo
 * INTEIRO -- e como `listar_pagina` no backend relê todos os atendimentos de
 * todos os subgrupos visíveis a cada página, percorrer o catálogo lia a
 * coleção N vezes. Medido: com 1.000 atendimentos, abrir a Agenda custava 10
 * requisições, 80 Queries e 10.000 itens lidos pra exibir uns 10 assuntos.
 *
 * Aqui o custo passa a depender de quantos atendimentos aparecem na TELA.
 *
 * ⚠️ `ids` vai como parâmetro REPETIDO (`?ids=a:b&ids=c:d`) -- `montarQuery`
 * já serializa array assim, e o FastAPI lê como `list[str]`. O par usa `:`
 * porque os ids são hexadecimais, então o separador nunca aparece dentro
 * deles.
 *
 * Par inexistente ou fora do escopo simplesmente não volta -- quem chama
 * trata ausência omitindo o rótulo.
 */
export function resumosDeAtendimentos(pares: { subgrupoId: string; atendimentoId: string }[]) {
  return chamar<{ resumos: ResumoDeAtendimento[] }>("/atendimentos/resumos", {
    query: { ids: pares.map((p) => `${p.subgrupoId}:${p.atendimentoId}`) },
  });
}

export function detalhesAtendimento(subgrupoId: string, atendimentoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}`);
}

export function criarAtendimento(dados: {
  subgrupo_id: string;
  assunto: string;
  cliente_ids: string[];
  primeiro_registro: string;
  /** Quem responde. Ausente ou vazio vira quem está criando -- resolvido no
   * SERVIDOR, e só se essa pessoa for membro do subgrupo. É isso que faz a
   * API poder subir antes do front. */
  responsaveis?: string[];
  processo_numero?: string | null;
}) {
  return chamar("/atendimentos", { method: "POST", body: { ...dados } });
}

/** PATCH parcial: campo omitido não é tocado. */
export function atualizarAtendimento(
  subgrupoId: string,
  atendimentoId: string,
  campos: {
    assunto?: string;
    status?: string;
    cliente_ids?: string[];
    /** ⚠️ Lista VAZIA é recusada pelo servidor: no PATCH quem edita está na
     * tela e vê o campo, então esvaziá-lo é engano. Omitir é "não enviei". */
    responsaveis?: string[];
    processo_numero?: string | null;
  },
) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}`, {
    method: "PATCH",
    body: { ...campos },
  });
}

/** O registro é ACRESCENTADO -- a linha do tempo não se edita nem se apaga.
 * É registro de atendimento a cliente: reescrever o passado é justamente o
 * que ele não pode permitir. */
export function adicionarRegistro(subgrupoId: string, atendimentoId: string, texto: string) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}/registros`, {
    method: "POST",
    body: { texto },
  });
}

export function removerAtendimento(subgrupoId: string, atendimentoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/atendimentos/${atendimentoId}`, { method: "DELETE" });
}
