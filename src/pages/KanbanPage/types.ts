import type { IntervaloDeDatas, Tarefa } from "../../types";

/** Estado dos filtros do quadro.
 *
 * `subgrupoId` está aqui junto dos outros por conveniência, mas não é um
 * filtro: cada subgrupo tem o PRÓPRIO quadro, então trocá-lo troca de
 * quadro. Por isso ele não entra no "Limpar filtros".
 */
export interface FiltrosDoQuadro {
  subgrupoId: string;
  /** Id de `PERIODOS_FUTUROS`/`PERIODOS_PASSADOS`, `PERIODO_TODOS` (o
   * único que não limita nada) ou `PERIODO_PERSONALIZADO`. */
  periodoId: string;
  /** As pontas escolhidas a dedo. Só é lido quando `periodoId` é o
   * personalizado -- guardado separado pra que voltar pro personalizado
   * depois de passar por "Este mês" não perca o que a pessoa escolheu. */
  intervaloPersonalizado?: IntervaloDeDatas;
  /** Mostra a coluna de Arquivado no quadro.
   *
   * Desligado por padrão: o Arquivado é o depósito do que já saiu do fluxo,
   * e à vista rouba largura do que está em andamento. Não é um filtro --
   * ligar ADICIONA uma coluna, nunca esconde tarefa -- então fica fora do
   * "tem filtro?" e do "Limpar filtros". */
  mostrarArquivadas: boolean;
  /** "todas", "sem" (sem responsável) ou o e-mail de alguém. */
  pessoa: string;
  busca: string;
}

// `Vinculo`/`VinculosDaTarefa` subiram pra `src/types` junto com o
// `ModalDeTarefa`, que virou componente geral quando a Agenda passou a
// abrir a mesma tarefa.

/** A tarefa arrastada e a coluna em que ela caiu. */
export interface MoverTarefa {
  tarefa: Tarefa;
  destino: string;
}

/** O par que identifica a tarefa apontada pelo lembrete de e-mail. */
export interface TarefaDoLink {
  subgrupoId: string;
  tarefaId: string;
}

/** O que a mutation de renomear recebe. */
export interface RenomearColuna {
  id: string;
  nome: string;
}
