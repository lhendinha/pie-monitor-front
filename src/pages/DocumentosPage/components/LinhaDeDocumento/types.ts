import type { Documento } from "../../../../types";

export interface LinhaDeDocumentoProps {
  documento: Documento;
  /** Traduz `subgrupo_id` em nome. Vem da PÁGINA, e não de um
   * `useNomeDeSubgrupo()` aqui dentro: o hook por linha seria uma assinatura
   * de query por documento da página. Mesmo arranjo de `LinhaProcesso`. */
  subgrupoNome: (id: string) => string;
  onAbrir: (documento: Documento) => void;
}
