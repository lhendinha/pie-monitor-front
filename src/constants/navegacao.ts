import type { ItemNavegacao } from "../types";

/** Ordem e rótulos vêm do artifact de referência.
 *
 * `Grupo` sai do menu pro `user` (decisão de 21/08). É só navegação: pra quem
 * é `user`, Grupo é tela de configuração que ele não administra e ocupa
 * espaço à toa. **A rota `/grupo` continua funcionando** por link direto, e
 * nenhum piso de permissão muda -- lá dentro as sub-abas seguem se filtrando
 * pelo próprio piso, como sempre fizeram.
 */
export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { caminho: "/", rotulo: "Área de trabalho", icone: "Workspace" },
  { caminho: "/kanban", rotulo: "Gestão kanban", icone: "Kanban" },
  { caminho: "/agenda", rotulo: "Agenda", icone: "Agenda" },
  { caminho: "/atendimentos", rotulo: "Atendimentos", icone: "Atendimentos" },
  { caminho: "/processos", rotulo: "Processos", icone: "Processos" },
  { caminho: "/clientes", rotulo: "Clientes", icone: "Clientes" },
  { caminho: "/documentos", rotulo: "Documentos", icone: "Documentos" },
  { caminho: "/historico", rotulo: "Histórico", icone: "Historico" },
  { caminho: "/grupo", rotulo: "Grupo", icone: "Grupo", minimo: "manager" },
];
