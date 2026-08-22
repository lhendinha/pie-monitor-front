import { chamar } from "./client";

interface OpcoesListarTarefas {
  /** Filtra pelas tarefas de um processo -- é o que o detalhe do processo
   * usa. Sem ele, a única saída seria paginar a lista inteira do grupo e
   * peneirar no cliente. */
  processoNumero?: string;
  subgrupoId?: string;
  apenasAbertas?: boolean;
  pagina?: number;
  tamanhoPagina?: number;
}

export function listarTarefas(opcoes: OpcoesListarTarefas = {}) {
  const { processoNumero, subgrupoId, apenasAbertas, pagina, tamanhoPagina } = opcoes;
  return chamar("/tarefas", {
    query: {
      processo_numero: processoNumero,
      subgrupo_id: subgrupoId,
      apenas_abertas: apenasAbertas ? "true" : undefined,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}
