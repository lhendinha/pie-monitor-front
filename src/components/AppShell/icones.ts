import {
  IconeAgenda,
  IconeAtendimentos,
  IconeClientes,
  IconeGrupo,
  IconeHistorico,
  IconeKanban,
  IconeProcessos,
  IconeWorkspace,
} from "../Icons";

/** Nome do ícone (como vem de `constants/navegacao`) -> componente.
 *
 * O mapa existe pra que `ITENS_NAVEGACAO` continue sendo dado puro, sem
 * importar JSX -- assim ele pode ser lido e testado sem montar React. */
export const ICONES_MENU: Record<string, () => JSX.Element> = {
  Workspace: IconeWorkspace,
  Kanban: IconeKanban,
  Agenda: IconeAgenda,
  Atendimentos: IconeAtendimentos,
  Processos: IconeProcessos,
  Clientes: IconeClientes,
  Historico: IconeHistorico,
  Grupo: IconeGrupo,
};
