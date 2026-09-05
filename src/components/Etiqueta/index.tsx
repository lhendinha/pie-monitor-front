import { Box } from "@chakra-ui/react";
import type { EtiquetaProps } from "./types";

/** Pílula de estado (`.role-badge` / `.status-badge` do artifact): 11px/800
 * em caixa alta, 3px 9px, totalmente arredondada.
 *
 * Cor E texto, sempre: quem não distingue duas pílulas claras continua
 * lendo "Admin" e "Gerente", "Enviado" e "Falha".
 */
export default function Etiqueta({ cores, children }: EtiquetaProps) {
  return (
    <Box
      as="span"
      display="inline-block"
      fontSize="11px"
      fontWeight="800"
      textTransform="uppercase"
      letterSpacing="0.02em"
      p="3px 9px"
      borderRadius="full"
      whiteSpace="nowrap"
      /* Só desenha a linha quando alguém pede a cor dela -- ver `cores`. */
      borderWidth={cores.borderColor ? "1px" : undefined}
      {...cores}
    >
      {children}
    </Box>
  );
}
