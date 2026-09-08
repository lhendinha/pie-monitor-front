import type { CatalogoFinanceiro } from "../../../../types";

export interface CamposDeContaEResponsavelProps {
  catalogo?: CatalogoFinanceiro;
  contaId: string;
  onConta: (id: string) => void;
  responsavel: string;
  onResponsavel: (email: string) => void;
  /** O departamento do lançamento -- é dele que sai a lista de pessoas. */
  subgrupoId: string;
  tentou: boolean;
  semConta: boolean;
}
