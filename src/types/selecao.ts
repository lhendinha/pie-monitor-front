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
export type MotivoDeRecusa =
  | "nao_existe"
  | "responsavel_mudou"
  /* Já estava onde o lote queria pôr. Não é erro: é o que faz repetir o lote
     ser inócuo. Arquivada conta como concluída. */
  | "ja_concluida"
  | "ja_na_coluna"
  | "ja_e_o_responsavel"
  /* O quadro do subgrupo não tem coluna marcada como conclusão. */
  | "sem_coluna_de_conclusao"
  /* A pessoa escolhida não é membro DAQUELE subgrupo -- vem com o nome dele. */
  | "nao_e_membro";

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
  /** Só em `nao_e_membro`: ONDE pedir acesso. O id não é palavra que alguém
   * reconheça. */
  subgrupo_nome?: string;
}

/** O que `POST /tarefas/remocao-em-lote` devolve. */
export interface ResultadoDoLote {
  removidas: number;
  ignoradas: TarefaNaoTocada[];
  recusadas: TarefaNaoTocada[];
}

/** O que `POST /tarefas/conclusao-em-lote` devolve. */
export interface ResultadoDaConclusao {
  concluidas: number;
  ignoradas: TarefaNaoTocada[];
  recusadas: TarefaNaoTocada[];
}

/** O que `POST /tarefas/status-em-lote` devolve. */
export interface ResultadoDoStatus {
  movidas: number;
  ignoradas: TarefaNaoTocada[];
  recusadas: TarefaNaoTocada[];
}

/** O que `POST /tarefas/atribuicao-em-lote` devolve.
 *
 * ⚠️ `impedidas` é o terceiro jeito de não tocar uma tarefa, e não se confunde
 * com os outros dois: a pessoa escolhida não é membro do subgrupo dela.
 * Resultado parcial legítimo, não erro. */
export interface ResultadoDaAtribuicao {
  atribuidas: number;
  impedidas: TarefaNaoTocada[];
  ignoradas: TarefaNaoTocada[];
  recusadas: TarefaNaoTocada[];
}

/** O pedido de mudar o status de muitas: as tarefas e a coluna -- que é de UM
 * quadro, e por isso as tarefas são de um subgrupo só. */
export interface PedidoDeStatusEmLote {
  tarefas: Tarefa[];
  colunaId: string;
}

/** O pedido de atribuir muitas. `responsavelId` nulo DEVOLVE ao pool. */
export interface PedidoDeAtribuicaoEmLote {
  tarefas: Tarefa[];
  responsavelId: string | null;
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
