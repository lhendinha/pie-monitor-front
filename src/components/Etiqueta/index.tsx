import { Box } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  /** Fundo e texto -- vêm de fora porque o significado da cor é de quem
   * usa: papel, status de envio, o que for. */
  cores: Pick<ButtonProps, "bg" | "color">;
  children: ReactNode;
}

/** Pílula de estado (`.role-badge` / `.status-badge` do artifact): 11px/800
 * em caixa alta, 3px 9px, totalmente arredondada.
 *
 * Cor E texto, sempre: quem não distingue duas pílulas claras continua
 * lendo "Admin" e "Gerente", "Enviado" e "Falha".
 */
export default function Etiqueta({ cores, children }: Props) {
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
      {...cores}
    >
      {children}
    </Box>
  );
}
