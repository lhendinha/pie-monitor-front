import { useNavigate, useParams } from "react-router-dom";

import { useSessaoContexto } from "../contexts/SessaoContext";
import { AceitarConvitePage } from "../pages";

/** Liga a `AceitarConvitePage` ao router, como a `RotaLogin` faz com o
 * login -- a página segue pura e não sabe que router existe.
 *
 * Existe porque aceitar convite TERMINA numa sessão aberta: o serviço já
 * salva os tokens, então o que falta é avisar o estado de sessão e navegar.
 * Antes isso era `window.location.href = "/"`, um reload completo do SPA.
 */
export default function RotaConvite() {
  const { token = "" } = useParams();
  const navegar = useNavigate();
  const { entrar } = useSessaoContexto();

  return (
    <AceitarConvitePage
      token={token}
      onEntrar={() => {
        entrar();
        navegar("/", { replace: true });
      }}
    />
  );
}
