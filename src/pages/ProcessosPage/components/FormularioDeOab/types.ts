export interface FormularioDeOabProps {
  buscando: boolean;
  onBuscar: (numeroOab: string, ufOab: string, periodo: { de: string; ate: string }) => void;
  onCancelar: () => void;
  /** Abre o período já visível -- é o que o aviso de "processos demais" usa
   * para a pessoa não ter de procurar onde escolher. */
  periodoAberto?: boolean;
}
