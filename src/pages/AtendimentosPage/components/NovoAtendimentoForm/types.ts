import type { OpcoesBuscaveis } from "../../../../types";

export interface NovoAtendimentoFormProps {
  /** Primeira página + busca -- ver `useSubgruposBuscaveis`. */
  subgrupos: OpcoesBuscaveis;
  onSalvo: () => void;
  onFechar: () => void;
}
