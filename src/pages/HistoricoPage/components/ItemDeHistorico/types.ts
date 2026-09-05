import type { HistoricoItem } from "../../../../types";

export interface ItemDeHistoricoProps {
  /** Traduz `subgrupos_notificados` nos nomes que a pessoa PODE ver,
   * descartando os demais. Vem da página -- uma consulta para a lista
   * inteira, não uma por item. */
  subgruposVisiveis: (ids: string[] | undefined) => string[];
  item: HistoricoItem;
  onAbrir: (item: HistoricoItem) => void;
}
