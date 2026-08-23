import { Stack } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { Rotulo } from "../../../../components";

interface Props {
  rotulo: string;
  children: ReactNode;
}

/** Rótulo e valor, como o `.field` do artifact -- mas de LEITURA, sem
 * controle.
 *
 * O `Campo` do sistema não serve aqui: ele é de formulário e exige o `id` de
 * um controle pra apontar o `htmlFor`, e neste modal não há controle nenhum
 * -- um `<label for>` apontando pra nada é rótulo que não rotula.
 */
export default function CampoDeLeitura({ rotulo, children }: Props) {
  return (
    <Stack gap="6px">
      <Rotulo variante="campo" as="p">
        {rotulo}
      </Rotulo>
      {children}
    </Stack>
  );
}
