export interface RotuloDeSecaoProps {
  /** Primeiro da lista não desenha a linha de cima -- ela existe pra
   * SEPARAR seções, e antes da primeira não há o que separar. */
  primeiro?: boolean;
  children: string;
}
