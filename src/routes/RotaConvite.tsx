import { useParams } from "react-router-dom";

import { AceitarConvitePage } from "../pages";

export default function RotaConvite() {
  const { token = "" } = useParams();
  return <AceitarConvitePage token={token} />;
}
