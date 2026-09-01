import { Box } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface EtiquetaProps {
  /** Fundo e texto -- vêm de fora porque o significado da cor é de quem
   * usa: papel, status de envio, o que for.
   *
   * ⚠️ `borderColor` é OPCIONAL e sem ela não há borda nenhuma: o artifact
   * declara `.etq { border: 1px solid transparent }` e só as variantes que
   * precisam a pintam (`.etq-neutra`, `.etq-info`). Torná-la obrigatória
   * mudaria a altura de todas as pílulas que já existem em 2px. */
  cores: Pick<ButtonProps, "bg" | "color" | "borderColor">;
  children: ReactNode;
}

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
