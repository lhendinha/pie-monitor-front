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
  const [deepLink, setDeepLink] = useState<DeepLinkHistorico | null>(
    () => (local.state as { deepLink?: DeepLinkHistorico } | null)?.deepLink || null,
  );

  return (
    <HistoricoPage deepLink={deepLink} onDeepLinkConsumido={() => setDeepLink(null)} />
  );
}
