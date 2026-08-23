import { useNavigate, useParams } from "react-router-dom";

import { useSessaoContexto } from "../contexts/SessaoContext";
import { RedefinirSenhaPage } from "../pages";

/** Liga a `RedefinirSenhaPage` ao router.
 *
 * `redefinirSenha` já devolve a sessão aberta, então o caminho é o mesmo do
 * convite: avisar o estado de sessão e navegar, em vez do reload completo
 * que estava aqui.
 */
export default function RotaRedefinirSenha() {
  const { token = "" } = useParams();
  const navegar = useNavigate();
  const { entrar } = useSessaoContexto();

  return (
    <RedefinirSenhaPage
      token={token}
      onConcluido={() => {
        entrar();
        navegar("/", { replace: true });
      }}
    />
  );
}
