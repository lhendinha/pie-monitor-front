import { useQuery } from "@tanstack/react-query";

import { TETO_POR_PAGINA } from "../../../constants";
import { listarTarefas } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type { Tarefa } from "../../../types";

interface Janela {
  /** Vazias = "Todos os períodos", e aí vem o subgrupo inteiro. */
  dataDe?: string;
  dataAte?: string;
}

/** As tarefas que o quadro mostra: as do subgrupo, dentro da janela de
 * datas escolhida.
 *
 * ⚠️ A janela vai pro SERVIDOR (`data_de`/`data_ate`), não é peneirada
 * depois. O quadro abre filtrado no mês -- carregar o histórico inteiro pra
 * jogar fora quase tudo seriam dezenas de requisições e milhares de cartões
 * num subgrupo com anos de tarefas (elas não somem ao concluir, só mudam de
 * coluna).
 *
 * 🔴 Mesmo com a janela, o resultado PAGINA, e `tamanho_pagina` tem teto de
 * 100. Pedir 100 e assumir que deu renderiza um quadro incompleto e sem
 * erro nenhum: cartões simplesmente não aparecem. Por isso busca página a
 * página até somar o `total` -- dentro de uma janela isso costuma ser uma
 * requisição, duas num mês movimentado.
 *
 * E isso é pré-requisito da busca, que roda no cliente porque
 * `GET /tarefas` não tem `busca` (ao contrário de `/clientes` e
 * `/atendimentos`). Buscar no que está carregado só é honesto se o que está
 * carregado for a janela INTEIRA -- senão a busca mente em silêncio,
 * dizendo "nenhum resultado" pra um cartão que existe. A tela ainda avisa
 * quando o vazio pode ser culpa da janela.
 */
export function useTarefasDoQuadro(subgrupoId: string, janela: Janela) {
  return useQuery<Tarefa[]>({
    queryKey: qk.tarefas({ subgrupoId, ...janela, quadro: true }),
    enabled: Boolean(subgrupoId),
    queryFn: async () => {
      const juntas: Tarefa[] = [];
      let pagina = 1;
      for (;;) {
        const resposta = (await listarTarefas({
          subgrupoId,
          ...janela,
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
