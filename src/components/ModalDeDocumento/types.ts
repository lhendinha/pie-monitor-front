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

export interface ModalDeDocumentoProps {
  /** Subgrupo em que o modal ABRE. Depois disso quem manda é o seletor.
   * Vazio quando o modal veio da tela geral, que não tem subgrupo em mãos. */
  subgrupoInicial?: string;
  /** Vínculos já preenchidos -- é o que faz "Adicionar documento" de dentro
   * de um processo nascer com aquele processo escolhido. */
  vinculosIniciais?: Partial<VinculosDeRegistro>;
  /** A aba do cliente abre o modal com ele dentro. */
  clientesIniciais?: ClientesIniciaisDoDocumento;
  onSalvo: () => void;
  onFechar: () => void;
}
