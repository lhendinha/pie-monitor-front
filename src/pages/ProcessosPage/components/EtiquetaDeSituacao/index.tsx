import { Text } from "@chakra-ui/react";

import { estadoDoAchado, etiquetaDoAchado } from "../../../../utils/importacao";
import { CORES_DA_ETIQUETA_DE_SITUACAO } from "../../constants";
import type { EtiquetaDeSituacaoProps } from "./types";

/** A pílula da coluna "Situação" da prévia da importação. */
export default function EtiquetaDeSituacao({ processo }: EtiquetaDeSituacaoProps) {
  return (
    <Text
      /* Medido no desenho: 10px/800, `letter-spacing` .04em e caixa alta --
         a mesma forma das outras pílulas do sistema. */
      as="span"
      display="inline-block"
      fontSize="10px"
      fontWeight="800"
      letterSpacing="0.04em"
      textTransform="uppercase"
      flexShrink={0}
      px="8px"
      py="3px"
      borderRadius="999px"
      {...CORES_DA_ETIQUETA_DE_SITUACAO[estadoDoAchado(processo)]}
      /* ⚠️ Não trunca: "já está em Civil, Criminal" cortado viraria "já está
         em Civil, Crimi…" -- e o nome pela metade é pior que nome nenhum. */
      whiteSpace="nowrap"
    >
      {etiquetaDoAchado(processo)}
    </Text>
  );
}
