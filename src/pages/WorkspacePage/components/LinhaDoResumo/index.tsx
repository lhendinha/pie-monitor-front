import { Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../components";
import type { NumeroDoResumo } from "../../types";

interface Props {
  numero: NumeroDoResumo;
}

const ESTILO = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  p: "9px 0",
  fontSize: "13px",
  fontWeight: "700",
  borderBottomWidth: "1px",
  borderBottomColor: "border.subtle",
  _last: { borderBottomWidth: 0 },
} as const;

/** Uma linha do "Resumo rápido": rótulo à esquerda, número à direita.
 *
 * Vira botão só quando há destino. Enquanto Kanban e Atendimentos não
 * existirem, esses números informam sem prometer navegação que não tem pra
 * onde ir.
 */
export default function LinhaDoResumo({ numero }: Props) {
  const cor =
    numero.valor > 0 && numero.tom
      ? numero.tom === "bad"
        ? "status.bad.text"
        : "status.warn"
      : "fg.muted";

  const conteudo = (
    <>
      <Text as="span">{numero.rotulo}</Text>
      <Text as="span" fontFamily="mono" color={cor}>
        {numero.valor}
      </Text>
    </>
  );

  if (!numero.ir) {
    return (
      <Flex {...ESTILO} color="fg">
        {conteudo}
      </Flex>
    );
  }

  return (
    <BotaoNu type="button" onClick={numero.ir} _hover={{ color: "brand.dark" }} {...ESTILO}>
      {conteudo}
    </BotaoNu>
  );
}
