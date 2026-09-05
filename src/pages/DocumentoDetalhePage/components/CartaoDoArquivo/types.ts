import type { Documento } from "../../../../types";

export interface CartaoDoArquivoProps {
  documento: Documento;
  /** Trocar o arquivo APAGA o antigo, então segue a mesma régua do excluir
   * -- ver `podeDestruirDocumento`. Quem decide é a página; aqui só se
   * obedece, pra a regra não ficar escrita em dois lugares. */
  podeSubstituir: boolean;
  onSubstituido: () => void;
}
