import { NOME_PAPEL } from "../../constants";
import { CORES_DO_PAPEL } from "../../theme/papel";
import Etiqueta from "../Etiqueta";
import type { Papel } from "../../types";

interface EtiquetaDePapelProps {
  papel?: Papel;
}

/** O papel da pessoa como etiqueta (`.role-badge` do artifact), com uma cor
 * por papel. */
export default function EtiquetaDePapel({ papel }: EtiquetaDePapelProps) {
  if (!papel) return null;
  return <Etiqueta cores={CORES_DO_PAPEL[papel]}>{NOME_PAPEL[papel]}</Etiqueta>;
}
