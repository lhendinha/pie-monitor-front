import type { TipoOpcaoProcesso } from "../../../../types";

export interface OpcoesListaProps {
  tipo: TipoOpcaoProcesso;
  /** "Fases" / "Situações", pras mensagens de erro. */
  titulo: string;
  /** "fase" / "situação" -- vira "Nova fase" no campo e "Desativar fase" no
   * diálogo. */
  nomeSingular: string;
}
