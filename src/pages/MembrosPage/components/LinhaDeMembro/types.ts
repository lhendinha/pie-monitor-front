import type { Membro } from "../../../../types";

export interface LinhaDeMembroProps {
  membro: Membro;
  /** Nomes dos subgrupos da pessoa, já resolvidos: `membro.subgrupos` traz
   * ids, e id não diz nada pra quem lê.
   *
   * ⚠️ LISTA, e não a string pronta: quem decide como resumir é
   * `EtiquetasDeSubgrupo`, que precisa saber QUANTOS são. Com a string já
   * unida, a contagem estaria perdida. */
  subgruposNomes: string[];
  /** Só `super_admin` edita membro (piso de `PATCH /grupos/membros/{email}`).
   * Sem isso, a linha inteira nem é clicável. */
  podeEditar: boolean;
  onEditar: (m: Membro) => void;
}
