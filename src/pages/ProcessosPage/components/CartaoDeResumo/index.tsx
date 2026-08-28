import { Box, Text } from "@chakra-ui/react";

import { TONS_DO_CARTAO_DE_RESUMO } from "../../constants";

interface CartaoDeResumoProps {
  numero: number;
  /** Já concordado em número -- quem chama usa `concordar`. */
  rotulo: string;
  tom?: keyof typeof TONS_DO_CARTAO_DE_RESUMO;
}

/** Um número grande e o que ele conta, na fileira da prévia da importação. */
export default function CartaoDeResumo({ numero, rotulo, tom = "neutro" }: CartaoDeResumoProps) {
  const { cor, ...caixa } = { cor: undefined, ...TONS_DO_CARTAO_DE_RESUMO[tom] };
  return (
    <Box p="13px 15px" border="1px solid" borderColor="border" borderRadius="10px" {...caixa}>
      <Text
        fontSize="25px"
        fontWeight="800"
        lineHeight="1.15"
        letterSpacing="-0.02em"
        /* Os quatro números ficam um do lado do outro: sem tabular, "11" e
           "44" saem com larguras diferentes e a fileira dança. */
        className="num"
        color={cor}
      >
        {numero}
      </Text>
      <Text fontSize="12px" fontWeight="500" color="fg.muted" mt="1px">
        {rotulo}
      </Text>
    </Box>
  );
}
