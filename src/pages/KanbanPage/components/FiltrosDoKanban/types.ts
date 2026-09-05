import type { FiltrosDoQuadro } from "../../types";
import type { OpcoesBuscaveis } from "../../../../types";

export interface FiltrosDoKanbanProps {
  /** Primeira página + busca -- ver `useSubgruposBuscaveis`. */
  subgrupos: OpcoesBuscaveis;
  /** O nome do subgrupo em uso, que pode estar fora da primeira página. */
  subgrupoNome: string;
  /** Idem, pras pessoas. Só carrega quando a pílula abre. */
  pessoas: OpcoesBuscaveis;
  /** Se a lista de PESSOAS entra na pílula -- ver `podeListarPessoas`.
   * Quem é `user` fica com as opções que não dependem dela. */
  mostrarPessoas: boolean;
  filtros: FiltrosDoQuadro;
  onMudar: (parcial: Partial<FiltrosDoQuadro>) => void;
  /** Trocar de quadro é o que a memória do subgrupo precisa observar. */
  onEscolherSubgrupo: (id: string, nome: string) => void;
}
