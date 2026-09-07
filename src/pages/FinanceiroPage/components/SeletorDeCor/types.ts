export interface SeletorDeCorProps {
  /** A paleta, na ordem em que o servidor a manda. */
  cores: string[];
  escolhida: string;
  onEscolher: (cor: string) => void;
  /** `id` do primeiro botão, para o `Campo` ter o que nomear. */
  id: string;
}
