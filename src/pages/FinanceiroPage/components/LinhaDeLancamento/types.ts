import type { Lancamento } from "../../../../types";

export interface LinhaDeLancamentoProps {
  lancamento: Lancamento;
  /** O nome da categoria e o da conta, resolvidos pelo catálogo.
   *
   * ⚠️ Vêm de FORA porque o lançamento traz só os ids: o catálogo inteiro já
   * é lido uma vez pela tela, e pedir o nome por linha seria uma consulta
   * por linha. */
  categoriaNome: string;
  contaNome: string;
  onAbrir: () => void;
}
