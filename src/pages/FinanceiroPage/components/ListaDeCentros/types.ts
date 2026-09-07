import type { CentroDeCusto } from "../../../../types";

export interface ListaDeCentrosProps {
  centros: CentroDeCusto[];
  podeEscrever: boolean;
  /** Qual centro está com o nome aberto para edição. Vazio = nenhum. */
  centroEmEdicao: string;
  salvando: boolean;
  onAdicionar: (nome: string) => void;
  onIniciarEdicao: (centroId: string) => void;
  onRenomear: (centroId: string, nome: string) => void;
  onCancelarEdicao: () => void;
  onAlternarAtivo: (centro: CentroDeCusto) => void;
}
