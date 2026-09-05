import type { Membro } from "../../../../types";

/** As props de `EditarMembroForm` que o formulário usa -- todas menos a
 * lista de grupos e a permissão de mover, que só a tela lê. */
export interface OpcoesDoFormularioDeMembro {
  membro: Membro;
  onAtualizado: () => void;
  onFechar: () => void;
}
