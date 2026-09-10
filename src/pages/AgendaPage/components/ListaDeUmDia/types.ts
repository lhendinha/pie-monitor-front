import type { Tarefa } from "../../../../types";

export interface ListaDeUmDiaProps {
  data: Date;
  tarefas: Tarefa[];
  assuntoDoAtendimento: (id: string) => string | undefined;
  /** Repassado à linha -- a página resolve, esta visão só entrega. */
  subgrupoNome: (id: string) => string;
  onAbrir: (tarefa: Tarefa) => void;
  /** A seleção de uma tarefa, quando o modo está ligado. `undefined` deixa
   * a linha como sempre foi: um botão que abre.
   *
   * ⚠️ É função POR TAREFA e atravessa as camadas sem que nenhuma delas
   * precise saber o que é seleção -- elas só repassam. */
  selecaoDe?: (tarefa: Tarefa) => { marcada: boolean; onAlternar: (comShift: boolean) => void } | undefined;

  /** Desenha a data no cabeçalho.
   *
   * ⚠️ DIVERGE do artifact na visão "Por dia": lá o mesmo rótulo aparece na
   * barra de datas E no cabeçalho do cartão, a 40px um do outro. Na visão em
   * lista o cabeçalho é necessário (são vários dias empilhados); na de um
   * dia só, é a mesma frase duas vezes. */
  comData?: boolean;
}
