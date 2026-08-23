import { Text } from "@chakra-ui/react";

import { mascararNumeroProcesso } from "../../../../utils";

interface Props {
  numero: string;
}

/** O número do processo em destaque no meio de uma frase.
 *
 * Mascarado e em mono, como em toda a aplicação: 20 dígitos corridos no meio
 * de um texto não se leem.
 */
export default function NumeroDoProcesso({ numero }: Props) {
  return (
    <Text as="strong" fontFamily="mono" fontWeight="700">
      {mascararNumeroProcesso(numero)}
    </Text>
  );
}
