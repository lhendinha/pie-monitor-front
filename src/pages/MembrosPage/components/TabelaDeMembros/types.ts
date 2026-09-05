import type { Membro } from "../../../../types";

export interface TabelaDeMembrosProps {
  membros: Membro[];
  /** id do subgrupo -> nome. `membro.subgrupos` traz ids, e id não diz nada
   * pra quem lê. */
  podeEditar: boolean;
  onEditar: (m: Membro) => void;
}
