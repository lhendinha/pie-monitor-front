export interface CamposDeDataProps {
  verificar: string;
  prazo: string;
  onVerificar: (iso: string) => void;
  onPrazo: (iso: string) => void;
  /** Qual calendário está aberto -- no máximo um. */
  calendario: "verificar" | "prazo" | null;
  onCalendario: (qual: "verificar" | "prazo", aberto: boolean) => void;
}
