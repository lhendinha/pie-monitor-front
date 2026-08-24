import { useNavigate, useParams } from "react-router-dom";

import { RedefinirSenhaPage } from "../pages";

/** Liga a `RedefinirSenhaPage` ao router.
 *
 * ⚠️ Redefinir senha NÃO abre sessão -- o backend responde só
 * `{"mensagem": "senha redefinida"}`. Quem devolve tokens é o
 * `aceitarConvite`, e este arquivo dizia o contrário. Por isso o destino
 * aqui é o `/login`, não a área logada.
 */
export default function RotaRedefinirSenha() {
  const { token = "" } = useParams();
  const navegar = useNavigate();

  return (
    <RedefinirSenhaPage
      token={token}
      onConcluido={() => {
        // 🔴 NÃO chama `entrar()`: `redefinirSenha` não abre sessão nenhuma.
        //
        // O backend responde só `{"mensagem": "senha redefinida"}` -- quem
        // devolve tokens é o `aceitarConvite`. Chamar `entrar()` marcava a
        // sessão como válida sem token no `localStorage`: a pessoa caía na
        // Área de trabalho, a primeira requisição saía com `Bearer ` vazio,
        // tomava 401, e ela era mandada de volta ao login com "Sua sessão
        // expirou. Entre de novo." -- logo após um reset bem-sucedido.
        navegar("/login", { replace: true });
      }}
    />
  );
}
