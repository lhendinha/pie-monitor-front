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
  pagina?: number;
  tamanhoPagina?: number;
}

export function listarTarefas(opcoes: OpcoesListarTarefas = {}) {
  const { processoNumero, subgrupoId, responsavel, semResponsavel, apenasAbertas, pagina, tamanhoPagina } =
    opcoes;
  return chamar("/tarefas", {
    query: {
      processo_numero: processoNumero,
      subgrupo_id: subgrupoId,
      responsavel: responsavel,
      sem_responsavel: semResponsavel ? "true" : undefined,
      apenas_abertas: apenasAbertas ? "true" : undefined,
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
  campos: { coluna_id?: string; responsavel_id?: string | null },
) {
  return chamar(`/subgrupos/${subgrupoId}/tarefas/${tarefaId}`, { method: "PATCH", body: campos });
}
