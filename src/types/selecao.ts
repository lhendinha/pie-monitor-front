/** A seleção múltipla de tarefas: o que a tela marca e o que o lote manda.
 *
 * 🔴 A CHAVE de uma tarefa é o par `(subgrupo_id, tarefa_id)`, nunca só o id:
 * o `tarefa_id` é único dentro da partição do subgrupo, e duas tarefas de
 * subgrupos diferentes podem colidir. Um `Set<string>` de ids soltos
 * apagaria a errada, e o defeito só apareceria com dois subgrupos na tela --
 * que é o caso normal da Agenda.
 */

import type { Tarefa } from "./tarefa";

/** Por que uma tarefa do lote não foi tocada. Espelha as constantes de
 * `api/src/services/tarefas_em_lote_service.py` -- os dois lados mudam
 * juntos, como em `ALVO_*` de notificação. */
export type MotivoDeRecusa = "nao_existe" | "responsavel_mudou";

/** O par que identifica a tarefa, mais o responsável que a TELA VIU. É ele
 * que o servidor confere antes de agir: vazio tem que continuar vazio. */
export interface ChaveDeTarefa {
  subgrupo_id: string;
  tarefa_id: string;
  /** `null` é afirmação ("a tela viu sem responsável"), não omissão. */
  responsavel_id: string | null;
}

/** Uma tarefa que o lote não tocou, e por quê. */
export interface TarefaNaoTocada {
  subgrupo_id: string;
  tarefa_id: string;
  motivo: MotivoDeRecusa;
  /** Só em `responsavel_mudou`: quem é o dono agora. */
  responsavel_atual?: string | null;
}

/** O que `POST /tarefas/remocao-em-lote` devolve. */
export interface ResultadoDoLote {
  removidas: number;
  ignoradas: TarefaNaoTocada[];
  recusadas: TarefaNaoTocada[];
}

/** O estado da caixa do topo. `indeterminada` é o traço, não o tique --
 * marcar parte da lista e ver o tique cheio mentiria sobre o que sai. */
export type EstadoDaCaixa = "vazia" | "indeterminada" | "marcada";

/** O que `useSelecaoDeTarefas` devolve.
 *
 * Existe como tipo para que a barra do lote possa receber a seleção INTEIRA
 * em vez de oito props soltas -- o mesmo desenho de `OpcoesBuscaveis`, que
 * descreve o retorno de `useSubgruposBuscaveis`.
 *
 * ⚠️ `marcadas` é o conjunto de CHAVES (`subgrupo:tarefa`), nunca de ids
 * soltos: dois subgrupos podem ter tarefas de mesmo id. Ver `chaveDe`.
 */
export interface SelecaoDeTarefas {
  escopo: string;
  marcadas: Set<string>;
  estaMarcada: (tarefa: Tarefa) => boolean;
  entrar: (escopo: string) => void;
  sair: () => void;
  limpar: () => void;
  alternar: (tarefa: Tarefa, ordem: string[], comShift?: boolean) => void;
  alternarTodas: (chaves: string[]) => void;
  esquecer: (chaves: string[]) => void;
}
