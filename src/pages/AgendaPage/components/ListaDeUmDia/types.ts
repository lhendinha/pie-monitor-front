import type { Tarefa } from "../../../../types";

export interface ListaDeUmDiaProps {
  data: Date;
  tarefas: Tarefa[];
  assuntoDoAtendimento: (id: string) => string | undefined;
  /** Repassado à linha -- a página resolve, esta visão só entrega. */
  subgrupoNome: (id: string) => string;
  onAbrir: (tarefa: Tarefa) => void;
  /** Desenha a data no cabeçalho.
   *
   * ⚠️ DIVERGE do artifact na visão "Por dia": lá o mesmo rótulo aparece na
   * barra de datas E no cabeçalho do cartão, a 40px um do outro. Na visão em
   * lista o cabeçalho é necessário (são vários dias empilhados); na de um
   * dia só, é a mesma frase duas vezes. */
  comData?: boolean;
}
