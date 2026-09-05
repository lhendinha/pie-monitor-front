export interface FormularioNovaOpcaoProps {
  /** "fase" ou "situação", no singular -- vira o placeholder ("Nova fase"). */
  nomeSingular: string;
  enviando: boolean;
  erro?: string;
  onCriar: (rotulo: string) => void;
}
