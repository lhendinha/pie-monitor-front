import { Box } from "@chakra-ui/react";

import { NOME_PAPEL } from "../../constants";
import { CORES_DO_PAPEL } from "../../theme/papel";
import type { Papel } from "../../types";

interface Props {
  papel?: Papel;
}

/** O papel da pessoa como etiqueta (`.role-badge` do artifact): pílula de
 * 11px/800 em caixa alta, com uma cor por papel.
 *
 * Cor E texto, nunca só cor: quem não distingue as duas pílulas claras
 * continua lendo "Admin" e "Gerente".
 */
export default function EtiquetaDePapel({ papel }: Props) {
  if (!papel) return null;
  return (
    <Box
      as="span"
      display="inline-block"
      fontSize="11px"
      fontWeight="800"
      textTransform="uppercase"
      p="3px 9px"
      borderRadius="full"
      whiteSpace="nowrap"
      {...CORES_DO_PAPEL[papel]}
    >
      {NOME_PAPEL[papel]}
    </Box>
  );
}
