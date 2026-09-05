import type { TONS_DO_CARTAO_DE_RESUMO } from "../../constants";

export interface CartaoDeResumoProps {
  numero: number;
  /** Já concordado em número -- quem chama usa `concordar`. */
  rotulo: string;
  tom?: keyof typeof TONS_DO_CARTAO_DE_RESUMO;
}
