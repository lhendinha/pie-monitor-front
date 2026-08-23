import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface FaixaProps {
  tom: "ok" | "aviso";
  /** Alinha à esquerda quando o texto é uma frase, e não um selo. */
  aEsquerda?: boolean;
  children: ReactNode;
}

/** Faixa colorida de recado (`.gate-banner` do artifact): fundo do tom,
 * texto na cor forte dele, 13.5px/700. */
export default function Faixa({ tom, aEsquerda, children }: FaixaProps) {
  const cores =
    tom === "ok"
      ? { bg: "status.good.bg", color: "status.good" }
      : { bg: "status.warn.bg", color: "status.warn" };

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
