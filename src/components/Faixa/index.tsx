import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface FaixaProps {
  tom: "ok" | "aviso";
  /** Alinha à esquerda quando o texto é uma frase, e não um selo. */
  aEsquerda?: boolean;
  children: ReactNode;
}

/** Faixa colorida de recado (`.gate-banner` do artifact): fundo do tom,
 * texto na cor ESCURECIDA dele, 13.5px/700.
 *
 * 🔴 `status.*.text`, e não a cor cheia. 13,5px não é "texto grande" (a
 * régua começa em 18,66px em negrito), então vale 4,5:1 -- e a cor cheia
 * sobre o próprio tint dava 3,00:1 no aviso e 3,12:1 no ok. **Toda faixa do
 * sistema estava assim**, nos dois tons; o vermelho já tinha sido corrigido
 * em outro componente e ninguém tinha medido estes dois. */
export default function Faixa({ tom, aEsquerda, children }: FaixaProps) {
  const cores =
    tom === "ok"
      ? { bg: "status.good.bg", color: "status.good.text" }
      : { bg: "status.warn.bg", color: "status.warn.text" };

  return (
    <Box
      p="12px 14px"
      borderRadius="md"
      fontSize="13.5px"
      fontWeight="700"
      textAlign={aEsquerda ? "left" : "center"}
      {...cores}
    >
      {children}
    </Box>
  );
}
