/** Estado dos filtros do quadro.
 *
 * `subgrupoId` está aqui junto dos outros por conveniência, mas não é um
 * filtro: cada subgrupo tem o PRÓPRIO quadro, então trocá-lo troca de
 * quadro. Por isso ele não entra no "Limpar filtros".
 */
export interface FiltrosDoQuadro {
  subgrupoId: string;
  /** Id de `PERIODOS`. "todos" é o único que não limita nada. */
  periodoId: string;
  /** "todas", "sem" (sem responsável) ou o e-mail de alguém. */
  pessoa: string;
  busca: string;
}
