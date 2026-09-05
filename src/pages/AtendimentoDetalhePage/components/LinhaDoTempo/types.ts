import type { RegistroDeAtendimento } from "../../../../types";

export interface LinhaDoTempoProps {
  registros: RegistroDeAtendimento[];
  /** Apelido de quem escreveu. O registro guarda só o e-mail, e quem
   * resolve o nome é a página. */
}
