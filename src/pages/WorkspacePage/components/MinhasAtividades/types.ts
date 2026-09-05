import type { ResumoDaAreaDeTrabalho } from "../../../../types";

export interface MinhasAtividadesProps {
  resumo?: ResumoDaAreaDeTrabalho;
  carregando: boolean;
  /** A consulta falhou.
   *
   * Sem isto, os `?? 0` espalhados aqui transformavam a falha em ZERO:
   * "Tarefas atrasadas: 0", com barra desenhada e tudo. É o número que a
   * pessoa abre o app pra ver, e zero é a resposta que ela mais quer --
   * então a mentira passa sem ser questionada. */
  falhou?: boolean;
  onTentarDeNovo?: () => void;
  tentando?: boolean;
}
