import type { Atendimento, CamposDoAtendimento } from "../../../../types";

export interface FormularioAtendimentoProps {
  atendimento: Atendimento;
  salvando: boolean;
  /** ⚠️ Só o que MUDOU, e por isso tudo é opcional. Ver
   * `utils/atendimentos.ts`. */
  onSalvar: (campos: CamposDoAtendimento) => void;
}
