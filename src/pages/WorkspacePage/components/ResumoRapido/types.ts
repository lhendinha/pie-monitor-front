import type { ResumoDaAreaDeTrabalho } from "../../../../types";

export interface ResumoRapidoProps {
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
  /** Leva ao card "Disponíveis para assumir", que já está NESTA tela.
   *
   * 🔴 Os outros números navegam; este não tem pra onde ir -- a lista que ele
   * conta está a poucos centímetros, no mesmo filtro (`semResponsavel` +
   * apenas abertas). Mandar pra outra tela mostraria a mesma coisa duas
   * vezes; mandar pra Agenda mostraria MENOS, porque lá tudo é limitado pela
   * janela de datas e tarefa sem responsável existe em qualquer dia. */
  onVerSemResponsavel?: () => void;
}
