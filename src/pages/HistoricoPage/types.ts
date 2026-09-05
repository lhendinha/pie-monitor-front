import type { DeepLinkHistorico } from "../../types";

/** O que o link de e-mail aponta: o processo e a comunicação dentro dele. */
export interface AlvoDoDeepLink {
  processo: string;
  comunicacaoId: string;
}

export interface HistoricoPageProps {
  deepLink?: DeepLinkHistorico | null;
  /** Com que filtro a tela abre, quando quem navegou até aqui já sabe.
   *
   * Vem da Área de trabalho: "Envios com falha" cruza os dois tipos, então
   * ela manda `""` (todos). Sem isso, o clique caía em Movimentações e o
   * número da tela não batia com o número clicado. Só vale na PRIMEIRA
   * montagem -- depois quem manda é o filtro da própria tela. */
  tipoEnvioInicial?: string;
  /** Idem, pros dois filtros que a home aciona.
   *
   * "Envios com falha" manda `{ tipoEnvio: "", apenasComFalha: true }` -- a
   * falha cruza os dois tipos. "Movimentações (N dias)" manda
   * `{ tipoEnvio: "movimentacao", dias: DIAS_DA_JANELA_RECENTE }`. Sem eles,
   * o clique abria uma lista MAIOR que o número clicado: medido em
   * 26/08/2026, 2 contra 6 e 3 contra 4. */
  apenasComFalhaInicial?: boolean;
  diasInicial?: number;
  onDeepLinkConsumido?: () => void;
}
