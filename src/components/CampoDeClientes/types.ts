export interface CampoDeClientesProps {
  id: string;
  /** Ids escolhidos. */
  valor: string[];
  /** Nome de cada id escolhido -- a etiqueta precisa mostrar nome, e o
   * resultado da busca some quando o termo muda. Guardado por fora pra que
   * a etiqueta não dependa de a busca ainda estar na tela. */
  nomes: Map<string, string>;
  onMudar: (ids: string[], nomes: Map<string, string>) => void;
}
