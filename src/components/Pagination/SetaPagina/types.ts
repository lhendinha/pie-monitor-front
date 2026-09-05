export interface SetaPaginaProps {
  direcao: "anterior" | "proxima";
  desabilitado: boolean;
  onClick: () => void;
}
