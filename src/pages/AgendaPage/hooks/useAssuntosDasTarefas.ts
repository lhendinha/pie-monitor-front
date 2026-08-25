import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { resumosDeAtendimentos } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type { Tarefa } from "../../../types";

/** Assunto dos atendimentos que as tarefas DESTA TELA referenciam.
 *
 * 🔴 Antes a Agenda pedia o catálogo INTEIRO de atendimentos pra montar o
 * mapa `id -> assunto`. Como `listar_pagina` no backend relê todos os
 * atendimentos de todos os subgrupos visíveis a CADA página, percorrer o
 * catálogo lia a coleção N vezes. Medido em 1.000 atendimentos: 10
 * requisições, 80 Queries e 10.000 itens lidos pra exibir uns 10 assuntos.
 *
 * O custo passa a depender de quantos atendimentos aparecem na tela, não de
 * quantos o escritório tem -- é a variável errada trocada pela certa.
 *
 * ⚠️ Uma requisição, não uma por id. `useQueries` com uma query por
 * atendimento também desacoplaria do tamanho do catálogo, mas o número de
 * requisições cresceria com o PERÍODO que a pessoa escolhe na Agenda -- um
 * trimestre viraria dezenas de chamadas paralelas, e o navegador serializa
 * em ~6 por host. Com lote, um dia e um trimestre custam o mesmo.
 */
export function useAssuntosDasTarefas(tarefas: Tarefa[]) {
  /* Pares DISTINTOS: o mesmo atendimento em cinco tarefas é uma chave só.
   *
   * A chave da query é derivada deles e ordenada -- sem ordenar, a mesma
   * tela em ordem diferente viraria outra entrada no cache. */
  const pares = useMemo(() => {
    const vistos = new Map<string, { subgrupoId: string; atendimentoId: string }>();
    for (const t of tarefas) {
      if (!t.atendimento_id) continue;
      vistos.set(`${t.subgrupo_id}:${t.atendimento_id}`, {
        subgrupoId: t.subgrupo_id,
        atendimentoId: t.atendimento_id,
      });
    }
    return [...vistos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, par]) => par);
  }, [tarefas]);

  const query = useQuery({
    queryKey: qk.resumosDeAtendimentos(
      pares.map((p) => `${p.subgrupoId}:${p.atendimentoId}`),
    ),
    queryFn: () => resumosDeAtendimentos(pares),
    /* Sem par nenhum não há o que perguntar -- e uma requisição com lista
       vazia voltaria vazia de qualquer forma. */
    enabled: pares.length > 0,
  });

  const assuntoPorId = useMemo(
    () => new Map((query.data?.resumos || []).map((r) => [r.atendimento_id, r.assunto])),
    [query.data],
  );

  return {
    /** `undefined` quando o atendimento não veio -- a linha então omite o
     * pedaço em vez de mostrar um id cru. Mesma interface de antes. */
    assuntoDoAtendimento: (atendimentoId: string) => assuntoPorId.get(atendimentoId),
    falhou: query.isError,
  };
}
