import { BotaoNu } from "../../BotaoNu";
import type { SetaPaginaProps } from "./types";

/** Seta de página (`.pagination-seta` do artifact): quadrado de 30px com
 * borda, glifo de 16px. */
export default function SetaPagina({ direcao, desabilitado, onClick }: SetaPaginaProps) {
  const anterior = direcao === "anterior";
  return (
    <BotaoNu
      type="button"
      disabled={desabilitado}
      onClick={onClick}
      title={anterior ? "Página anterior" : "Próxima página"}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="30px"
      h="30px"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border"
      borderRadius="sm"
      bg="bg.surface"
      color="fg.muted"
      fontSize="16px"
      lineHeight="1"
      _hover={{ bg: "border.subtle", color: "fg" }}
      _disabled={{ opacity: 0.4, cursor: "default", _hover: { bg: "bg.surface" } }}
    >
      {anterior ? "‹" : "›"}
    </BotaoNu>
  );
}
