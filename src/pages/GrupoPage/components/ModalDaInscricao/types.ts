import type { InscricaoAvulsa, Subgrupo } from "../../../../types";

export interface ModalDaInscricaoProps {
  /** A inscrição sendo EDITADA. Ausente = está se cadastrando uma nova. */
  inscricao?: InscricaoAvulsa;
  subgrupos: Subgrupo[];
  carregandoSubgrupos: boolean;
  salvando: boolean;
  /** Recusa vinda do servidor, já com a mensagem dele -- inscrição que é de
   * alguém com conta, que o tribunal não conhece, ou o tribunal fora do ar. */
  erro?: string;
  onSalvar: (numero: string, uf: string, ligada: boolean, destinos: string[]) => void;
  onFechar: () => void;
}
