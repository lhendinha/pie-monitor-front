import type { Subgrupo } from "../../../../types";

export interface NovoProcessoFormProps {
  subgrupos: Subgrupo[];
  /** Distingue "ainda não chegou" de "não existe nenhum". Sem isto o modal
   * abria afirmando "Crie um subgrupo primeiro" durante o carregamento --
   * uma frase falsa pra quem tem subgrupos, e pior que não dizer nada. */
  carregandoSubgrupos?: boolean;
  onCadastrado: () => void;
  onFechar: () => void;
}
