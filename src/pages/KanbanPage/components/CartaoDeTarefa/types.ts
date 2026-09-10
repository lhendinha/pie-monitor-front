import type { Tarefa } from "../../../../types";

export interface CartaoDeTarefaProps {
  tarefa: Tarefa;
  /** Apelido de quem é responsável -- a tarefa guarda só o e-mail. */
  responsavel?: string;
  onAbrir: (tarefa: Tarefa) => void;

  /** O modo de seleção. Presente, o cartão DEIXA de arrastar e vira o
   * próprio `<label>` da caixa.
   *
   * 🔴 É aqui que a seleção custa mais caro: desliga o arraste, que é o
   * gesto principal desta tela. A barra diz isso em uma linha, em vez de
   * deixar a pessoa descobrir tentando. */
  selecao?: {
    marcada: boolean;
    onAlternar: (comShift: boolean) => void;
  };
}
