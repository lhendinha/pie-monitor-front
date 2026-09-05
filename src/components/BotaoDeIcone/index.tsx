import { Box } from "@chakra-ui/react";
import { forwardRef } from "react";

import { BotaoNu } from "../BotaoNu";
import type { BotaoDeIconeProps } from "./types";

/** Botão redondo só com ícone da barra superior (`.icon-btn` do artifact):
 * 34px, sem borda, cinza, e fundo suave no hover.
 *
 * ⚠️ `forwardRef` porque ele é gatilho de `Popover` (o sino): a lib precisa
 * da referência do elemento pra ancorar o painel. Sem ela o `positioning`
 * é silenciosamente ignorado e o painel abre no canto da JANELA, não
 * embaixo do botão -- foi exatamente o que aconteceu, e só apareceu
 * olhando a tela. Mesmo motivo do `PilulaDeFiltro`. */
const BotaoDeIcone = forwardRef<HTMLButtonElement, BotaoDeIconeProps>(function BotaoDeIcone(
  { rotulo, comAviso, onClick, children, ...resto },
  ref,
) {
  return (
    <BotaoNu
      ref={ref}
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
      {...resto}
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
});

export default BotaoDeIcone;
