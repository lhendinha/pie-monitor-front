import type { TomDoPonto } from "../../types";

export interface PontoProps {
  /** `ruim` pinta de vermelho -- é o que faz uma falha saltar numa lista
   * longa sem ler linha por linha.
   *
   * ⚠️ `bom` e `neutro` entraram com o menu de "Novo lançamento", onde a
   * bolinha distingue QUATRO caminhos (honorário, entrada, saída,
   * transferência) e não dois estados. É o mesmo desenho do artefato, com as
   * cores vindas dos tokens em vez de hexadecimais soltos. */
  tom?: TomDoPonto;
  /** Alinha com a PRIMEIRA linha de um bloco de texto de várias linhas.
   * Sem isso o ponto centraliza no bloco inteiro e fica flutuando no meio. */
  noTopo?: boolean;
}
