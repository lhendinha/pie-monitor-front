import type { ClientesIniciaisDoDocumento, VinculosDeRegistro } from "../../types";

/** As props de `ModalDeDocumento`, que são todas do formulário. A
 * explicação de cada uma está lá. */
export interface OpcoesDoFormularioDeDocumento {
  subgrupoInicial?: string;
  vinculosIniciais?: Partial<VinculosDeRegistro>;
  clientesIniciais?: ClientesIniciaisDoDocumento;
  onSalvo: () => void;
  onFechar: () => void;
}
