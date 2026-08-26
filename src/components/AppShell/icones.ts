import {
  IconeAgenda,
  IconeAtendimentos,
  IconeClientes,
  IconeDocumentos,
  IconeGrupo,
  IconeHistorico,
  IconeKanban,
  IconeProcessos,
  IconeWorkspace,
} from "../Icons";
import type { ComponentType } from "react";

/** Nome do ícone (como vem de `constants/navegacao`) -> componente.
 *
 * O mapa existe pra que `ITENS_NAVEGACAO` continue sendo dado puro, sem
 * importar JSX -- assim ele pode ser lido e testado sem montar React.
 *
 * `ComponentType`, e não `() => JSX.Element`: aquela assinatura exigia
 * ícone SEM props nenhuma, então bastou um deles ganhar `tamanho` opcional
 * pra ele deixar de caber no mapa. O menu continua montando `<Icone />`
 * sem passar nada. */
export const ICONES_MENU: Record<string, ComponentType> = {
  Workspace: IconeWorkspace,
  Kanban: IconeKanban,
  Agenda: IconeAgenda,
  Atendimentos: IconeAtendimentos,
  Processos: IconeProcessos,
  Clientes: IconeClientes,
  Documentos: IconeDocumentos,
  Historico: IconeHistorico,
  Grupo: IconeGrupo,
};
