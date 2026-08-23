import type { Intervalo } from "../../utils/periodo";

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
  intervaloPersonalizado?: Intervalo;
  /** "todas", "sem" (sem responsável) ou o e-mail de alguém. */
  pessoa: string;
  busca: string;
}

/** Um item vinculável achado na busca.
 *
 * `rotulo` e `detalhe` são só pra tela; o que sai daqui pro servidor é o
 * `id`, no campo que o `tipo` indica.
 */
export interface Vinculo {
  tipo: "processo" | "atendimento";
  id: string;
  rotulo: string;
  detalhe?: string;
}

/** Os vínculos de uma tarefa: até um de cada tipo.
 *
 * Duas fatias, e não uma lista, porque é o formato do backend --
 * `processo_numero` e `atendimento_id` são campos independentes, um valor
 * cada. Escolher um processo novo TROCA o anterior; não empilha.
 */
export interface VinculosDaTarefa {
  processo: Vinculo | null;
  atendimento: Vinculo | null;
}
