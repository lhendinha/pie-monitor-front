export interface CampoDeBuscaProps {
  rotulo: string;
  placeholder: string;
  valor: string;
  onMudar: (valor: string) => void;
  /** Teto de largura. O artifact usa 420px em Processos e 340px nas demais. */
  larguraMaxima?: string;
  /** O que está na tela ainda não corresponde ao que está escrito aqui --
   * ou porque a espera entre teclas não terminou, ou porque a consulta
   * ainda está vindo.
   *
   * Sem isto, o único sinal era a contagem do cabeçalho virando
   * "carregando…" em 11,5px cinza, longe do campo. Quem digita olha pro
   * campo. */
  buscando?: boolean;
}
