import type { VinculosDeRegistro } from "../../types";

export interface VinculoDeRegistroProps {
  valor: VinculosDeRegistro;
  onMudar: (vinculos: VinculosDeRegistro) => void;
  /** `id` do input, pro `Campo` que o rotula. Cada tela dá o seu -- duas
   * instâncias na mesma página com o mesmo `id` fariam o rótulo de uma
   * focar o campo da outra. */
  id?: string;
}
