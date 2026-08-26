import { useState } from "react";
import { useLocation } from "react-router-dom";

import { HistoricoPage } from "../pages";
import type { DeepLinkHistorico } from "../types";

/** Recebe o deep link que a `RotaRaiz` repassou pelo state da navegação.
 *
 * Guarda em estado local e limpa quando a página avisa que consumiu -- o
 * modal abre uma vez, e não volta a abrir a cada re-render. Ler direto do
 * `location.state` a cada render faria exatamente isso. */
export default function RotaHistorico() {
  const local = useLocation();
  const estado = local.state as
    | {
        deepLink?: DeepLinkHistorico;
        tipoEnvio?: string;
        apenasComFalha?: boolean;
        dias?: number;
      }
    | null;
  const [deepLink, setDeepLink] = useState<DeepLinkHistorico | null>(
    () => estado?.deepLink || null,
  );

  return (
    <HistoricoPage
      deepLink={deepLink}
      /* ⚠️ A Área de trabalho MANDAVA `tipoEnvio` e ninguém lia. Clicar em
         "Envios com falha" esperava o carregamento e entregava a lista de
         Movimentações -- onde o número não bate com o que foi clicado, e
         nada explica por quê. Só na primeira montagem: depois disso quem
         manda é o filtro da própria tela. */
      tipoEnvioInicial={estado?.tipoEnvio}
      /* 🔴 O mesmo defeito, medido em 26/08/2026: "Envios com falha" dizia 2
         e abria 6; "Movimentações (7 dias)" dizia 3 e abria 4. O tipo já
         chegava aqui, mas não existia filtro de falha nem de data -- nem na
         tela, nem na API. */
      apenasComFalhaInicial={estado?.apenasComFalha}
      diasInicial={estado?.dias}
      onDeepLinkConsumido={() => setDeepLink(null)}
    />
  );
}
