import { Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../components";
import type { NumeroDoResumo } from "../../types";

interface LinhaDoResumoProps {
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
 * Vira botão só quando há destino -- botão que não vai a lugar nenhum é pior
 * que texto.
 *
 * ⚠️ Este comentário dizia "enquanto Kanban e Atendimentos não existirem".
 * Eles passaram a existir e ninguém voltou aqui, então três números ficaram
 * sem link por inércia. Hoje só "Tarefas atrasadas" continua sem, e por uma
 * razão que se sustenta: não há tela que mostre o que ele conta (abertas em
 * QUALQUER dia passado) -- ver o comentário em `ResumoRapido`.
 */
export default function LinhaDoResumo({ numero }: LinhaDoResumoProps) {
  const cor =
    numero.valor > 0 && numero.tom
      ? numero.tom === "bad"
        ? "status.bad.text"
        /* `warn.text` pelo mesmo motivo do irmão logo acima -- o número é
           13px, e a cor cheia sobre o cartão branco dá 3,35:1. As duas
           metades deste ternário discordavam sobre a mesma régua. */
        : "status.warn.text"
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
