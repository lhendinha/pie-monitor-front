import type { VisaoDaAgenda } from "../../types";

export interface SeletorDeVisaoProps {
  visao: VisaoDaAgenda;
  onMudar: (visao: VisaoDaAgenda) => void;
  /** No modo "Atrasadas" a lista ignora o calendário, então trocar de visão
   * não teria efeito -- e uma pílula que não faz nada parece quebrada. */
  desabilitado?: boolean;
  /** Vira `title`: quem passa o mouse descobre POR QUE está desabilitada.
   * Controle desabilitado sem explicação é o pior dos dois. */
  motivo?: string;
}
