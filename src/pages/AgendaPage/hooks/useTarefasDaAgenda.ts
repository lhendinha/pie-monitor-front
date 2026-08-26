import { useQuery } from "@tanstack/react-query";

import { TETO_POR_PAGINA } from "../../../constants";
import { listarTarefas } from "../../../services";
import { qk } from "../../../services/queryKeys";
import { emDias } from "../../../utils";
import type { IntervaloDeDatas, Tarefa } from "../../../types";
import type { PeriodoDaAgenda } from "../types";

/** As tarefas que a Agenda mostra: as dos subgrupos escolhidos, dentro do
 * período visível.
 *
 * A Agenda é uma PROJEÇÃO das tarefas por data -- a mesma lista do Kanban e
 * da Área de trabalho, nunca uma cópia.
 *
 * ⚠️ O intervalo vai pro SERVIDOR (`data_de`/`data_ate`). E ele é o da
 * VISÃO, não o do mês: na grade mensal as células de fora do mês também
 * mostram tarefa, então quem calcula é `intervaloDaVisao`.
 *
 * 🔴 Pagina até somar o `total`, como o quadro. `tamanho_pagina` tem teto de
 * 100, e pedir 100 assumindo que deu renderiza uma agenda incompleta sem
 * erro nenhum: as tarefas do fim do mês simplesmente não aparecem, e um dia
 * cheio parece vazio.
 *
 * `subgrupoIds` vazio significa "todos os visíveis" -- é o que o servidor
 * entende quando o parâmetro não vai.
 */
export function useTarefasDaAgenda(
  subgrupoIds: string[],
  intervalo: IntervaloDeDatas,
  periodo: PeriodoDaAgenda = "todos",
) {
  /* 🔴 "Atrasadas" troca a FORMA da consulta, não só um valor: sai a janela
     da visão e entram `apenasAbertas` + `dataAte: ontem`. É a mesma
     definição que o card "Tarefas atrasadas" da Área de trabalho conta --
     abertas com `data < hoje` --, e é ela que faz o número bater com a
     lista que o clique abre.

     ⚠️ `emDias(-1)`, o mesmo auxiliar que o Resumo rápido usa -- ele monta
     pelo relógio LOCAL, nunca por `toISOString()`, que às 21h em Brasília já
     devolve o dia seguinte e faria a tarefa de hoje aparecer como atrasada
     toda noite. */
  const atrasadas = periodo === "atrasadas";
  const parametrosDeData = atrasadas
    ? { apenasAbertas: true, dataAte: emDias(-1) }
    : { dataDe: intervalo.de, dataAte: intervalo.ate };

  return useQuery<Tarefa[]>({
    /* ⚠️ `periodo` na CHAVE. Sem ele, ligar "Atrasadas" reusaria o resultado
       da janela anterior -- lista errada, sem erro nenhum. */
    queryKey: qk.tarefas({
      agenda: true,
      subgrupoIds: [...subgrupoIds].sort(),
      periodo,
      ...(atrasadas ? {} : intervalo),
    }),
    queryFn: async () => {
      const juntas: Tarefa[] = [];
      let pagina = 1;
      for (;;) {
        const resposta = (await listarTarefas({
          subgrupoId: subgrupoIds.length ? subgrupoIds : undefined,
          ...parametrosDeData,
          pagina,
          tamanhoPagina: TETO_POR_PAGINA,
        })) as { tarefas: Tarefa[]; total: number; total_paginas: number };
        juntas.push(...resposta.tarefas);
        // Para quando já juntou o `total` anunciado. O segundo limite é rede
        // de segurança: se as duas contas discordarem, melhor parar que
        // girar pra sempre.
        if (juntas.length >= resposta.total || pagina >= resposta.total_paginas) break;
        pagina += 1;
      }
      return juntas;
    },
  });
}
