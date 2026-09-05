export interface AvatarProps {
  nome: string;
  /** `pequeno` (22px) é o do chip da barra superior; `medio` (30px) é o das
   * listas de pessoas, onde o avatar divide a linha com nome e e-mail. */
  tamanho?: "pequeno" | "medio";
}
