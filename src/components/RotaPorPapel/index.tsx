import { Navigate, Outlet } from "react-router-dom";

import { papelAtende } from "../../services";
import type { RotaPorPapelProps } from "./types";

/** Portão por PAPEL, complementando o `RotaProtegida`, que só olha se há
 * sessão.
 *
 * Sem isto, esconder um item do menu era só cosmético: quem digitasse o
 * endereço entrava na tela assim mesmo. A garantia de dado continua sendo
 * do servidor -- ele recusa por papel em cada rota; isto evita a pessoa
 * chegar numa tela que não é dela e ver metade dela funcionando.
 *
 * Redireciona pra Processos, que é a tela inicial de qualquer papel, em vez
 * de mostrar "sem permissão": não é erro, é lugar errado.
 */
export default function RotaPorPapel({ minimo }: RotaPorPapelProps) {
  if (!papelAtende(minimo)) return <Navigate to="/processos" replace />;
  return <Outlet />;
}
