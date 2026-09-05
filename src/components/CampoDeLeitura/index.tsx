import { Stack } from "@chakra-ui/react";

/* Irmão importado direto, e não pelo índice de `components`: este
   componente É exportado por aquele índice. */
import { Rotulo } from "../Rotulo";
import type { CampoDeLeituraProps } from "./types";

/** Rótulo e valor, como o `.field` do artifact -- mas de LEITURA, sem
 * controle.
 *
 * O `Campo` do sistema não serve aqui: ele é de formulário e exige o `id` de
 * um controle pra apontar o `htmlFor`, e num modal de leitura não há
 * controle nenhum -- um `<label for>` apontando pra nada é rótulo que não
 * rotula.
 *
 * ⚠️ Morava dentro de `HistoricoPage`, onde nasceu. Subiu pra cá em
 * 26/08/2026, quando o modal de movimentação do detalhe do processo passou
 * a precisar do mesmo par rótulo/valor: o alcance deixou de ser uma página.
 */
export default function CampoDeLeitura({ rotulo, children }: CampoDeLeituraProps) {
  return (
    <Stack gap="6px">
      <Rotulo variante="campo" as="p">
        {rotulo}
      </Rotulo>
      {children}
    </Stack>
  );
}
