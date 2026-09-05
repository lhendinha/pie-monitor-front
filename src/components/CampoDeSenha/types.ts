export interface CampoDeSenhaProps {
  id: string;
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  /** `current-password` pra entrar, `new-password` pra criar ou trocar --
   * é o que faz o gerenciador de senhas oferecer a coisa certa. */
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
}
