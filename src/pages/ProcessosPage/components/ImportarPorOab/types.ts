export interface ImportarPorOabProps {
  subgrupos: { subgrupo_id: string; nome: string }[];
  onFechar: () => void;
  /** Chamado quando algo entrou de fato -- a listagem precisa recarregar. */
  onImportou: () => void;
}
