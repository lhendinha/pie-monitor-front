import { Button } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  onClick: () => void;
  children: ReactNode;
}

/** Botão sem moldura, na cor da marca (`.btn-text` do artifact). Usado no
 * "← Voltar" das telas de detalhe. */
export default function BotaoDeTexto({ onClick, children }: Props) {
  return (
    <Button
      type="button"
      onClick={onClick}
      display="inline-flex"
      alignItems="center"
      gap="7px"
      h="auto"
      p="9px 6px"
      pl="0"
      bg="transparent"
      color="fg.brand"
      fontSize="13px"
      fontWeight="700"
      _hover={{ textDecoration: "underline" }}
    >
      {children}
    </Button>
  );
}
