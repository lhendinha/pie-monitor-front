export interface QuadroSemColunasProps {
  /** Quem PODE montar o quadro recebe o caminho; quem não pode recebe a quem
   * pedir. Criar coluna é `admin`, como o servidor exige. */
  podeMontar: boolean;
  onEditarQuadro: () => void;
}
