import type { EstadoDoAlvo, Notificacao } from "../../../../../types";

export interface LinhaDeNotificacaoProps {
  /** Traduz `subgrupo_id` em nome. Vem do SINO -- uma consulta para a lista
   * inteira, não uma por notificação. */
  subgrupoNome: (id: string) => string;
  notificacao: Notificacao;
  /** Apelido de quem agiu. O aviso guarda só o e-mail, e quem resolve o
   * nome é quem monta a lista. */
  /** `undefined` quando a notificação não leva a lugar nenhum -- e aí a
   * linha não é clicável, em vez de fingir que é. */
  onAbrir?: () => void;
  /** Presente, a linha é MORTA: ganha a marca, e `onAbrir` só a marca como
   * lida. */
  estadoMorto?: EstadoDoAlvo;
  /** O painel mistura subgrupos? Só então a linha diz de qual veio -- com
   * todas do mesmo, o nome repetido não diferencia nada. */
  mostrarSubgrupo?: boolean;
  ultima?: boolean;
}
