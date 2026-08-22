import { Box, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { Rotulo } from "../Rotulo";

interface Props {
  rotulo: string;
  /** `id` do controle que o rótulo nomeia. Obrigatório: rótulo sem `for`
   * não é lido junto do campo, e clicar nele não foca nada.
   *
   * Controle que não aceita `id` num elemento focável (o `SeletorData`, por
   * exemplo, precisa deixar o `id` gerado pela lib intacto no gatilho) se
   * liga pelo caminho inverso: este rótulo também publica um
   * `id="{para}-rotulo"` pra ser apontado por `aria-labelledby`. */
  para: string;
  obrigatorio?: boolean;
  /** Texto de apoio embaixo (`.field-hint`). */
  dica?: ReactNode;
  /** Mensagem de erro. Substitui a dica enquanto existir -- as duas juntas
   * competiriam pela mesma linha, e o erro é o que importa naquele
   * momento. */
  erro?: string;
  children: ReactNode;
}

/** Um campo de formulário (`.field` do artifact): rótulo, controle e dica.
 *
 * O rótulo é 12.5px/700 em `ink` -- **não** é o `Rotulo` em caixa-alta, que
 * é outra coisa (rótulo de coluna de filtro). O asterisco de obrigatório vai
 * em `bad`, como no artifact.
 */
export default function Campo({ rotulo, para, obrigatorio, dica, erro, children }: Props) {
  return (
    <Box mb="16px" position="relative">
      <Rotulo variante="campo" id={`${para}-rotulo`} htmlFor={para} mb="6px">
        {rotulo}
        {obrigatorio && (
          <Text as="span" color="status.bad" aria-hidden="true">
            {" *"}
          </Text>
        )}
      </Rotulo>
      {children}
      {erro ? (
        <Text fontSize="11.5px" color="status.bad" mt="5px" role="alert">
          {erro}
        </Text>
      ) : (
        dica && (
          <Text fontSize="11.5px" color="fg.subtle" mt="5px">
            {dica}
          </Text>
        )
      )}
    </Box>
  );
}
