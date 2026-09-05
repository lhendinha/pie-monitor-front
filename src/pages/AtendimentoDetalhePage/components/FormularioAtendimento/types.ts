import type { Atendimento } from "../../../../types";

export interface FormularioAtendimentoProps {
  atendimento: Atendimento;
  salvando: boolean;
  onSalvar: (campos: { assunto: string; status: string; responsaveis: string[] }) => void;
}
