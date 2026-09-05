import type { ProcessoEscolhido } from "../../types";

export interface CampoDeProcessoProps {
  id: string;
  valor: ProcessoEscolhido | null;
  onMudar: (escolhido: ProcessoEscolhido | null) => void;
}
