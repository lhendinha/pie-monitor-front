import { chamar } from "./client";
import { emFatias } from "../../utils/selecao";
import type {
  ChaveDeTarefa,
  NovaTarefa,
  OpcoesListarTarefas,
  ResultadoDaAtribuicao,
  ResultadoDaConclusao,
  ResultadoDoLote,
  ResultadoDoStatus,
} from "../../types";

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
export function removerTarefasEmLote(tarefas: ChaveDeTarefa[]): Promise<ResultadoDoLote> {
  return emFatias(tarefas, { removidas: 0, ignoradas: [], recusadas: [] }, (fatia) =>
    chamar("/tarefas/remocao-em-lote", { method: "POST", body: { tarefas: fatia } }) as Promise<ResultadoDoLote>,
  );
}

/** Cada tarefa vai para a coluna de conclusão DO SEU subgrupo -- por isso não
 * há coluna no corpo, e a seleção pode cruzar subgrupos. */
export function concluirTarefasEmLote(tarefas: ChaveDeTarefa[]): Promise<ResultadoDaConclusao> {
  return emFatias(tarefas, { concluidas: 0, ignoradas: [], recusadas: [] }, (fatia) =>
    chamar("/tarefas/conclusao-em-lote", { method: "POST", body: { tarefas: fatia } }) as Promise<ResultadoDaConclusao>,
  );
}

/** ⚠️ Todas do MESMO subgrupo: a coluna vem de um quadro, e o servidor recusa
 * a seleção cruzada inteira com 400. A tela desabilita o botão antes. */
export function alterarStatusEmLote(tarefas: ChaveDeTarefa[], colunaId: string): Promise<ResultadoDoStatus> {
  return emFatias(tarefas, { movidas: 0, ignoradas: [], recusadas: [] }, (fatia) =>
    chamar("/tarefas/status-em-lote", {
      method: "POST",
      body: { coluna_id: colunaId, tarefas: fatia },
    }) as Promise<ResultadoDoStatus>,
  );
}

/** `null` devolve ao pool -- é uma afirmação, não "não me perguntaram". */
export function atribuirTarefasEmLote(
  tarefas: ChaveDeTarefa[],
  responsavelId: string | null,
): Promise<ResultadoDaAtribuicao> {
  return emFatias(tarefas, { atribuidas: 0, impedidas: [], ignoradas: [], recusadas: [] }, (fatia) =>
    chamar("/tarefas/atribuicao-em-lote", {
      method: "POST",
      body: { responsavel_id: responsavelId, tarefas: fatia },
    }) as Promise<ResultadoDaAtribuicao>,
  );
}
