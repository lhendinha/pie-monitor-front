// As constantes de prioridade saíram daqui pra `src/constants/prioridade.ts`
// quando a Agenda passou a mostrar as mesmas tarefas -- mesmo caminho que os
// períodos já tinham feito pra `src/constants/periodos.ts`. Reexportadas
// porque o Kanban continua sendo consumidor legítimo delas.
export { CORES_DA_PRIORIDADE, PRIORIDADES } from "../../../constants/prioridade";
