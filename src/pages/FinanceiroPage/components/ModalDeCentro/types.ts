import type { CentroDeCusto } from "../../../../types";

export interface ModalDeCentroProps {
  /** O centro em edição, ou `undefined` para criar. */
  centro?: CentroDeCusto;
  salvando: boolean;
  /** A mensagem que a API devolveu (409 de nome repetido). O modal NÃO
   * fecha enquanto ela existir. */
  erro?: string;
  onSalvar: (nome: string, outro: boolean) => void;
  onFechar: () => void;
}
