import { BotaoNu } from "../../BotaoNu";
import type { NumeroPaginaProps } from "./types";

/** Número de página (`.pagination-numero` do artifact): sem borda, fonte
 * mono, e o atual em cheio na cor da marca. */
export default function NumeroPagina({ numero, atual, onClick }: NumeroPaginaProps) {
  return (
    <BotaoNu
      type="button"
      onClick={onClick}
      aria-current={atual ? "page" : undefined}
      display="flex"
      alignItems="center"
      justifyContent="center"
      minW="30px"
      h="30px"
      px="6px"
      borderRadius="sm"
      fontFamily="mono"
      fontSize="13px"
      fontWeight="700"
      bg={atual ? "fg.brand" : "transparent"}
      color={atual ? "white" : "fg.muted"}
      _hover={atual ? undefined : { bg: "border.subtle", color: "fg" }}
    >
      {numero}
    </BotaoNu>
  );
}
