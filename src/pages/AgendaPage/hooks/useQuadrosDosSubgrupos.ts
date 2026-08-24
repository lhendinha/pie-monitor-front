import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { listarQuadro } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type { Tarefa } from "../../../types";
import type {
  RespostaDoQuadro,
} from "../../../types/respostas";

/** Quadro muda raramente -- só `admin` edita coluna. Mesmo tempo que
 * `useConcluirTarefa` usa, e a mesma chave, então as duas telas dividem o
 * cache em vez de buscar duas vezes. */
const VALIDADE = 5 * 60 * 1000;

/** Os quadros dos subgrupos que a Agenda está mostrando.
 *
 * Responde as duas perguntas que a Agenda tem sobre a coluna de uma tarefa:
 * **em qual ela está** (a linha mostra o nome) e **se essa coluna conclui**
 * (a linha risca o título).
 *
 * ⚠️ A resposta é POR SUBGRUPO, sempre. Cada um tem o próprio quadro, e nada
 * impede que o mesmo `coluna_id` seja comum num e de conclusão no outro --
 * por isso a chave é o par (subgrupo, coluna), nunca a coluna sozinha.
 *
 * ⚠️ "Concluída" cobre `e_conclusao` E `e_arquivado`: arquivada é concluída
 * guardada, não um terceiro estado.
 *
 * ⚠️ NÃO usa `concluido_em`, que dispensaria estas consultas: aquele campo é
 * ausente em toda tarefa concluída antes do arquivamento existir, e toda
 * essa história apareceria na Agenda como pendente, sem risco.
 *
 * `carregando` existe pra que a tela ESPERE. Mostrar a lista antes dos
 * quadros chegarem escreve a tarefa concluída sem risco e a risca meio
 * segundo depois -- e, no intervalo, a tela afirma o contrário do que é.
 */
export function useQuadrosDosSubgrupos(subgrupoIds: string[]) {
  const consultas = useQueries({
    queries: subgrupoIds.map((id) => ({
      queryKey: qk.quadro(id),
      queryFn: () => listarQuadro(id) as Promise<RespostaDoQuadro>,
      staleTime: VALIDADE,
    })),
  });

  // 🔴 `isError` conta como "não sei", não como "está vazio".
  //
  // `carregando` olhava só `isPending`. Em erro ele é `false` e `data` é
  // `undefined`, então `concluem` e `nomes` ficavam vazios -- e a Agenda
  // renderizava normalmente afirmando o CONTRÁRIO do que é: toda tarefa
  // concluída aparecia em aberto, sem tachado, e a linha perdia o nome da
  // coluna. É o mesmo mal que o cabeçalho deste arquivo diz existir pra
  // evitar, pelo caminho do erro.
  const algumFalhou = consultas.some((c) => c.isError);
  const carregando = consultas.some((c) => c.isPending);
  /* Um array novo a cada render refaria os mapas sem necessidade; a string
     junta o que importa num valor comparável. */
  // ⚠️ As MARCAS entram na assinatura. Com só `id:nome`, mudar qual coluna
  // é a de conclusão não mudava a string -- o memo devolvia os conjuntos
  // velhos e a Agenda seguia riscando a coluna antiga até ser remontada.
  // Numa variável, não inline no array de deps: o React Compiler exige
  // expressões simples ali, e o valor é o mesmo.
  const chaveDosSubgrupos = subgrupoIds.join(",");
  const assinatura = consultas
    .map((c) =>
      (c.data?.colunas || [])
        .map((col) => `${col.coluna_id}:${col.nome}:${col.e_conclusao}:${col.e_arquivado}`)
        .join(","),
    )
    .join("|");

  const { concluem, nomes } = useMemo(() => {
    const concluem = new Set<string>();
    const nomes = new Map<string, string>();
    consultas.forEach((consulta, indice) => {
      (consulta.data?.colunas || []).forEach((coluna) => {
        const chave = `${subgrupoIds[indice]}:${coluna.coluna_id}`;
        nomes.set(chave, coluna.nome);
        if (coluna.e_conclusao || coluna.e_arquivado) concluem.add(chave);
      });
    });
    return { concluem, nomes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, chaveDosSubgrupos]);

  const chaveDe = (tarefa: Tarefa) => `${tarefa.subgrupo_id}:${tarefa.coluna_id}`;

  return {
    carregando,
    algumFalhou,
    estaConcluida: (tarefa: Tarefa) => concluem.has(chaveDe(tarefa)),
    /** `undefined` quando o quadro não conhece a coluna -- a linha então
     * omite o pedaço em vez de mostrar um id cru. */
    nomeDaColuna: (tarefa: Tarefa) => nomes.get(chaveDe(tarefa)),
  };
}
