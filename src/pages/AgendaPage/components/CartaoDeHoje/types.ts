import type { Tarefa } from "../../../../types";

export interface CartaoDeHojeProps {
  hoje: Date;
  tarefas: Tarefa[];
  carregando: boolean;
  /** No modo atrasadas o cartão não pode falar de hoje -- ver o 🔴 do index. */
  atrasadas: boolean;
  subgrupoNome: (id: string) => string;
  assuntoDoAtendimento: (id: string) => string | undefined;
  onAbrir: (tarefa: Tarefa) => void;
  /** A seleção de uma tarefa, quando o modo está ligado. `undefined` deixa a
   * linha como sempre foi: um botão que abre.
   *
   * ⚠️ É a MESMA função que a pilha de dias recebe. As duas listas mostram as
   * mesmas tarefas, e a seleção guarda CHAVE -- marcar aqui acende lá. */
  selecaoDe?: (tarefa: Tarefa) => { marcada: boolean; onAlternar: (comShift: boolean) => void } | undefined;
}
