import { chamar } from "./client";

interface OpcoesListarTarefas {
  /** Filtra pelas tarefas de um processo -- é o que o detalhe do processo
   * usa. Sem ele, a única saída seria paginar a lista inteira do grupo e
   * peneirar no cliente. */
  processoNumero?: string;
  subgrupoId?: string;
  /** `"eu"` resolve pro e-mail do token, no servidor. */
  responsavel?: string;
  semResponsavel?: boolean;
  apenasAbertas?: boolean;
  /** Intervalo de `data`, inclusivo nas duas pontas. */
  dataDe?: string;
  dataAte?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

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

interface NovaTarefa {
  subgrupo_id: string;
  titulo: string;
  data: string;
  coluna_id: string;
  prioridade: string;
  responsavel_id?: string | null;
  processo_numero?: string | null;
  observacoes?: string | null;
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
