// As constantes de prioridade saíram daqui pra `src/constants/prioridade.ts`
// quando a Agenda passou a mostrar as mesmas tarefas -- mesmo caminho que os
// períodos já tinham feito pra `src/constants/periodos.ts`. Reexportadas
// porque o Kanban continua sendo consumidor legítimo delas.
export { CORES_DA_PRIORIDADE, PRIORIDADES } from "../../constants/prioridade";

import { PERIODO_TODOS } from "../../constants";

/** O quadro ABRE SEM JANELA DE DATA -- diverge do artifact, que abre no mês
 * (`PERIODS = { kanban: 'mes' }`).
 *
 * O mês só fazia sentido enquanto a janela limitava uma ponta só. Desde que
 * ela passou a limitar as DUAS (necessário pros períodos passados, como
 * "Ontem" e "Últimos 7 dias"), "Este mês" ESCONDE tarefa vencida do mês
 * anterior -- num quadro, exatamente o que mais precisa de atenção.
 *
 * O custo conhecido: tarefa concluída não some, só muda de coluna, então a
 * coluna de conclusão acumula com o tempo. Preferimos um quadro cheio a um
 * quadro que mente sobre o que está em aberto -- e a separação certa
 * (aberta × concluída, que a API sabe fazer com `apenas_abertas`) fica pra
 * quando o desenho da coluna de conclusão for decidido. */
/* ⚠️ `mostrarArquivadas` fica FORA daqui de propósito: "Limpar filtros" não
   pode esconder uma coluna que a pessoa acabou de revelar. É preferência de
   visualização, não filtro. */
export const FILTROS_VAZIOS = {
  periodoId: PERIODO_TODOS,
  intervaloPersonalizado: undefined,
  pessoa: "todas",
  busca: "",
};
