import type { ClienteAFaturar } from "../../../../types";

export interface SecaoAFaturarProps {
  clientes: ClienteAFaturar[];
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
  /** Clicar num cliente abre a emissão dele -- é o único caminho para criar
   * uma fatura. */
  onEmitir: (cliente: ClienteAFaturar) => void;
}
