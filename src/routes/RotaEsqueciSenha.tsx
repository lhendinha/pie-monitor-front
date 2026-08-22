import { useNavigate } from "react-router-dom";

import { EsqueciSenhaPage } from "../pages";

export default function RotaEsqueciSenha() {
  const navegar = useNavigate();
  return <EsqueciSenhaPage onVoltar={() => navegar("/login")} />;
}
