import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { listarQuadro } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type { ColunaDoQuadro, Tarefa } from "../../../types";

/** Quadro muda raramente -- só `admin` edita coluna. Mesmo tempo que
 * `useConcluirTarefa` usa, e a mesma chave, então as duas telas dividem o
 * cache em vez de buscar duas vezes. */
const VALIDADE = 5 * 60 * 1000;

/** Diz, pra qualquer tarefa da Agenda, se ela está concluída.
 *
 * ⚠️ "Concluída" é DERIVADO de estar numa coluna marcada `e_conclusao` ou
 * `e_arquivado` -- arquivada é concluída guardada, não um terceiro estado.
 * E a marcação é POR SUBGRUPO: cada um tem o próprio quadro, e a coluna de
 * conclusão de um não diz nada sobre o outro. Por isso a chave é o par
 * (subgrupo, coluna), nunca a coluna sozinha.
 *
 * ⚠️ NÃO usa `concluido_em`, que seria uma consulta a menos: aquele campo é
 * ausente em toda tarefa concluída antes do arquivamento existir, e toda
 * essa história apareceria na Agenda como pendente, sem tachado.
 *
 * Enquanto os quadros não chegam, `carregando` é true e nada é dito como
 * concluído -- é melhor que tachar/destachar na frente da pessoa.
 */
export function useColunasQueConcluem(subgrupoIds: string[]) {
  const consultas = useQueries({
    queries: subgrupoIds.map((id) => ({
      queryKey: qk.quadro(id),
      queryFn: () => listarQuadro(id) as Promise<{ colunas: ColunaDoQuadro[] }>,
      staleTime: VALIDADE,
    })),
  });

  const carregando = consultas.some((c) => c.isPending);
  /* `map` numa dependência seria um array novo a cada render e refaria o
     Set sem necessidade; a string junta tudo num valor comparável. */
  const assinatura = consultas
    .map((c) => (c.data?.colunas || []).map((col) => col.coluna_id).join(","))
    .join("|");

  const chaves = useMemo(() => {
    const conjunto = new Set<string>();
    consultas.forEach((consulta, indice) => {
      (consulta.data?.colunas || []).forEach((coluna) => {
        if (coluna.e_conclusao || coluna.e_arquivado) {
          conjunto.add(`${subgrupoIds[indice]}:${coluna.coluna_id}`);
        }
      });
    });
    return conjunto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, subgrupoIds.join(",")]);

  return {
    carregando,
    estaConcluida: (tarefa: Tarefa) =>
      chaves.has(`${tarefa.subgrupo_id}:${tarefa.coluna_id}`),
  };
}
