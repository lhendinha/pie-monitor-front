import { chamar } from "./client";
import { TETO_POR_PAGINA } from "../../constants";
import type { ChaveDeTarefa, NovaTarefa, OpcoesListarTarefas, ResultadoDoLote } from "../../types";

export function listarTarefas(opcoes: OpcoesListarTarefas = {}) {
  const {
    processoNumero, subgrupoId, responsavel, semResponsavel, apenasAbertas,
    dataDe, dataAte, pagina, tamanhoPagina,
  } = opcoes;
  return chamar("/tarefas", {
    query: {
      processo_numero: processoNumero,
      subgrupo_id: subgrupoId,
      responsavel: responsavel,
      sem_responsavel: semResponsavel ? "true" : undefined,
      apenas_abertas: apenasAbertas ? "true" : undefined,
      data_de: dataDe,
      data_ate: dataAte,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

/** PATCH parcial de uma tarefa: campo omitido não é tocado.
 *
 * ⚠️ `subgrupo_id` NÃO entra: é parte da chave primária, e o DynamoDB não
 * altera chave. Mover tarefa entre subgrupos seria apagar e recriar, o que
 * troca o `tarefa_id` e mata os links de lembrete já enviados por e-mail. */
export function atualizarTarefa(
  subgrupoId: string,
  tarefaId: string,
  campos: Partial<Omit<NovaTarefa, "subgrupo_id">>,
) {
  return chamar(`/subgrupos/${subgrupoId}/tarefas/${tarefaId}`, { method: "PATCH", body: campos });
}

/** POST /tarefas.
 *
 * `subgrupo_id` vai no corpo, e não no caminho: é aqui que ele é ESCOLHIDO.
 * Depois de criada ele nunca mais muda -- faz parte da chave. */
export function criarTarefa(tarefa: NovaTarefa) {
  return chamar("/tarefas", { method: "POST", body: { ...tarefa } });
}

/** Uma tarefa só, pelo par que a identifica.
 *
 * Existe pro link do lembrete de prazo: aberto do e-mail, o front chega sem
 * nada em mãos. Pela listagem não dá -- ela não filtra por `tarefa_id`,
 * então seria paginar tudo até achar.
 */
export function detalhesTarefa(subgrupoId: string, tarefaId: string) {
  return chamar(`/subgrupos/${subgrupoId}/tarefas/${tarefaId}`);
}

export function removerTarefa(subgrupoId: string, tarefaId: string) {
  return chamar(`/subgrupos/${subgrupoId}/tarefas/${tarefaId}`, { method: "DELETE" });
}

/** Apaga muitas tarefas de uma vez (`manager`+).
 *
 * 🔴 Manda a LISTA que a tela contou, nunca um filtro. Com filtro, o servidor
 * apagaria também o que nasceu entre a contagem e o clique -- o número na
 * tela dizendo uma coisa e o servidor fazendo outra.
 *
 * ⚠️ Fatia em pedaços de `TETO_POR_PAGINA` porque a rota tem esse teto
 * (`MAXIMO_DE_TAREFAS_NO_LOTE`, no lado de lá), e SOMA os resultados: quem
 * chama vê um resultado só, não N. Os pedaços vão em sequência de propósito
 * -- em paralelo, um erro no meio deixaria o resto em voo sem ninguém saber
 * o que saiu.
 *
 * ⚠️ Uma falha em qualquer pedaço PROPAGA. O que já saiu, saiu -- o lote não
 * é transação nem aqui nem lá --, e quem chama recarrega a lista para ver o
 * que sobrou. Engolir o erro faria a tela afirmar um número que não aconteceu.
 */
export async function removerTarefasEmLote(tarefas: ChaveDeTarefa[]): Promise<ResultadoDoLote> {
  const total: ResultadoDoLote = { removidas: 0, ignoradas: [], recusadas: [] };
  for (let i = 0; i < tarefas.length; i += TETO_POR_PAGINA) {
    const pedaco = tarefas.slice(i, i + TETO_POR_PAGINA);
    const r = (await chamar("/tarefas/remocao-em-lote", {
      method: "POST",
      body: { tarefas: pedaco },
    })) as ResultadoDoLote;
    total.removidas += r.removidas;
    total.ignoradas.push(...r.ignoradas);
    total.recusadas.push(...r.recusadas);
  }
  return total;
}
