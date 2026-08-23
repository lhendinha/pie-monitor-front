import { useState } from "react";
import { useLocation } from "react-router-dom";

import { HistoricoPage } from "../pages";
import type { DeepLinkHistorico } from "../utils";

/** Recebe o deep link que a `RotaRaiz` repassou pelo state da navegação.
 *
 * Guarda em estado local e limpa quando a página avisa que consumiu -- o
 * modal abre uma vez, e não volta a abrir a cada re-render. Ler direto do
 * `location.state` a cada render faria exatamente isso. */
export default function RotaHistorico() {
  const local = useLocation();
  const estado = local.state as
    | { deepLink?: DeepLinkHistorico; tipoEnvio?: string }
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
      onDeepLinkConsumido={() => setDeepLink(null)}
    />
  );
}
