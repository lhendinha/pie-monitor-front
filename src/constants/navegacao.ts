import type { Papel } from "../types";

/** Um item do menu lateral. `minimo` é o papel a partir do qual ele APARECE
 * -- não é permissão: a rota continua acessível por link direto, e quem
 * decide o que a pessoa pode fazer é sempre o backend. */
export interface ItemNavegacao {
  caminho: string;
  rotulo: string;
  /** Nome do ícone em `components/Icons` (sem o prefixo `Icone`). */
  icone: string;
  minimo?: Papel;
  /** Tela ainda não construída. O item fica FORA do menu enquanto for true --
   * item que leva a tela vazia é pior que item ausente. Some junto com a
   * etapa que entrega a tela; a lista já está na ordem final de propósito,
   * pra que a navegação não mude de forma a cada entrega. */
  pendente?: boolean;
}

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
  { caminho: "/atendimentos", rotulo: "Atendimentos", icone: "Atendimentos", pendente: true },
  { caminho: "/processos", rotulo: "Processos", icone: "Processos" },
  { caminho: "/clientes", rotulo: "Clientes", icone: "Clientes" },
  { caminho: "/historico", rotulo: "Histórico", icone: "Historico" },
  { caminho: "/grupo", rotulo: "Grupo", icone: "Grupo", minimo: "manager" },
];
