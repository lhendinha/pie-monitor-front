import type { FiltrosDaAgenda as Filtros } from "../../types";
import type { OpcoesBuscaveis } from "../../../../types";

export interface FiltrosDaAgendaProps {
  /** O modo de seleção está de pé.
   *
   * 🔴 Trava a visão em lista, e a pílula DIZ por quê em vez de sumir --
   * controle que some parece defeito. Marcar caixa em célula de calendário
   * não tem onde caber. */
  selecionando?: boolean;
  /** Primeira página + busca -- ver `useSubgruposBuscaveis`. */
  subgrupos: OpcoesBuscaveis;
  /** Idem, pras pessoas. Só carrega quando a pílula abre. */
  pessoas: OpcoesBuscaveis;
  /** Se a lista de PESSOAS entra na pílula -- ver `podeListarPessoas`.
   * Quem é `user` fica com as opções que não dependem dela. */
  mostrarPessoas: boolean;
  filtros: Filtros;
  onMudar: (parcial: Partial<Filtros>) => void;
}
