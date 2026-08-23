import { useLocation, useNavigate } from "react-router-dom";

import { useSessaoContexto } from "../contexts/SessaoContext";
import { LoginPage } from "../pages";

/** Liga a `LoginPage` ao router. A página segue pura -- recebe callbacks e
 * não sabe que router existe, o que a mantém testável sem montar um. */
export default function RotaLogin() {
  const navegar = useNavigate();
  const local = useLocation();
  const { entrar, sessaoExpirada } = useSessaoContexto();

  /** Volta pro endereço que a pessoa tentou antes de ser mandada pro login
   * (ver `RotaProtegida`). É o que faz link de e-mail funcionar pra quem
   * estava deslogado. */
  const destino = (local.state as { de?: string } | null)?.de || "/";

  return (
    <LoginPage
      /* Sem isto, quem teve o token expirado é jogado no login sem nenhuma
         explicação e acha que o sistema perdeu o login dele à toa. */
      aviso={sessaoExpirada ? "Sua sessão expirou. Entre de novo." : undefined}
      onEntrar={() => {
        entrar();
        navegar(destino, { replace: true });
      }}
      onEsqueciSenha={() => navegar("/esqueci-senha")}
    />
  );
}
