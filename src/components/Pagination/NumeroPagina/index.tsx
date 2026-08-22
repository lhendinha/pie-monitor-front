import { BotaoNu } from "../../BotaoNu";

interface Props {
  numero: number;
  atual: boolean;
  onClick: () => void;
}

/** Número de página (`.pagination-numero` do artifact): sem borda, fonte
 * mono, e o atual em cheio na cor da marca. */
export default function NumeroPagina({ numero, atual, onClick }: Props) {
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
