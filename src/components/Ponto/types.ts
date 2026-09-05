export interface PontoProps {
  /** `ruim` pinta de vermelho -- é o que faz uma falha saltar numa lista
   * longa sem ler linha por linha. */
  tom?: "marca" | "ruim";
  /** Alinha com a PRIMEIRA linha de um bloco de texto de várias linhas.
   * Sem isso o ponto centraliza no bloco inteiro e fica flutuando no meio. */
  noTopo?: boolean;
}
