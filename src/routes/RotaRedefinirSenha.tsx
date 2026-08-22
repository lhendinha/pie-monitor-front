import { useParams } from "react-router-dom";

import { RedefinirSenhaPage } from "../pages";

export default function RotaRedefinirSenha() {
  const { token = "" } = useParams();
  return <RedefinirSenhaPage token={token} />;
}
