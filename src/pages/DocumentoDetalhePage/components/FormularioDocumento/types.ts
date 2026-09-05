import type { Documento } from "../../../../types";

export interface FormularioDocumentoProps {
  /** Traduz `subgrupo_id` em nome -- resolvido pela página. */
  subgrupoNome: (id: string) => string;
  /** O documento JÁ CARREGADO. Este componente não conhece estado de
   * consulta -- ver o comentário do componente. */
  documento: Documento;
  onSalvo: () => void;
  onRemover: () => void;
}
