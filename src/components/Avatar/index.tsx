import { Box } from "@chakra-ui/react";

import { iniciais } from "../../utils";
import type { AvatarProps } from "./types";

const MEDIDAS = {
  pequeno: { caixa: "22px", fonte: "10px" },
  medio: { caixa: "30px", fonte: "11px" },
};

/** As iniciais de alguém num círculo da marca.
 *
 * Recebe o NOME, e não as iniciais: quem chama não deve precisar saber como
 * "Ana Paula" vira "AP" -- e com duas cópias dessa decisão, uma delas
 * acabaria divergindo.
 */
export default function Avatar({ nome, tamanho = "medio" }: AvatarProps) {
  const { caixa, fonte } = MEDIDAS[tamanho];
  return (
    <Box
      /* Decorativo: o nome que ele abrevia está sempre escrito ao lado, e
         um leitor de tela anunciando "A P" antes de "Ana Paula" só atrapalha. */
      aria-hidden="true"
      w={caixa}
      h={caixa}
      borderRadius="full"
      bg="brand.tint2"
      color="brand.darker"
      fontSize={fonte}
      fontWeight="700"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flex="0 0 auto"
    >
      {iniciais(nome)}
    </Box>
  );
}
