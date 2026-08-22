import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useSessaoContexto } from "../../contexts/SessaoContext";

/** Portão das rotas autenticadas.
 *
 * Guarda o endereço tentado em `state.de` e o login devolve pra lá depois de
 * entrar. Sem isso, quem clica num link de e-mail estando deslogado entra e
 * cai na tela inicial, tendo que procurar à mão o item que o e-mail já
 * apontava.
 *
 * `replace` no redirecionamento: sem ele, o botão Voltar do navegador
 * levaria de volta pra rota protegida, que redirecionaria pro login de novo
 * -- laço visível pra quem usa.
 */
export default function RotaProtegida() {
  const { autenticado } = useSessaoContexto();
  const local = useLocation();

  if (!autenticado) {
    const destino = `${local.pathname}${local.search}`;
    return <Navigate to="/login" replace state={{ de: destino }} />;
  }

  return <Outlet />;
}
