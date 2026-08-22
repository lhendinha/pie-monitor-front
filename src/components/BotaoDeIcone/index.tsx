import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { BotaoNu } from "../BotaoNu";

interface Props {
  rotulo: string;
  /** Ponto vermelho de "tem coisa nova", como no artifact. */
  comAviso?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

/** Botão redondo só com ícone da barra superior (`.icon-btn` do artifact):
 * 34px, sem borda, cinza, e fundo suave no hover. */
export default function BotaoDeIcone({ rotulo, comAviso, onClick, children }: Props) {
  return (
    <BotaoNu
      type="button"
      title={rotulo}
      aria-label={rotulo}
      onClick={onClick}
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="34px"
      h="34px"
      borderRadius="full"
      color="fg.muted"
      _hover={{ bg: "border.subtle", color: "fg" }}
    >
      {children}
      {comAviso && (
        <Box
          position="absolute"
          top="6px"
          right="7px"
          w="7px"
          h="7px"
          borderRadius="full"
          bg="status.bad"
          borderWidth="1.5px"
          borderStyle="solid"
          borderColor="bg.surface"
        />
      )}
    </BotaoNu>
  );
}
