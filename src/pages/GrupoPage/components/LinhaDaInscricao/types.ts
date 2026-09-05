import type { InscricaoAvulsa, Subgrupo } from "../../../../types";

export interface LinhaDaInscricaoProps {
  inscricao: InscricaoAvulsa;
  /** Os subgrupos do grupo -- para traduzir os ids do destino em NOMES. Piso
   * `admin` na aba, e `listarSubgrupos` devolve todos para `admin`+. */
  subgrupos: Subgrupo[];
  /** Uma gravação DESTA linha está em voo. Por linha, e não pela lista toda:
   * numa lista de 50, travar tudo esconde qual delas está mudando. */
  emAndamento: boolean;
  /** Abre o modal com esta inscrição -- é lá que o destino se escolhe. */
  onAbrir: () => void;
  onDesligar: () => void;
  onRemover: () => void;
}
