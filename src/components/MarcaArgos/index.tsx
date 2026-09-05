import { Box, Flex, Text } from "@chakra-ui/react";
import type { MarcaArgosProps } from "./types";

const MEDIDAS = {
  menu: { simbolo: "26px", raio: "7px", palavra: "17px", direcao: "row", gap: "10px" },
  gate: { simbolo: "42px", raio: "12px", palavra: "19px", direcao: "column", gap: "10px" },
} as const;

/** A marca do Argos (`.brand` do artifact).
 *
 * O símbolo não é um quadrado chapado: é um quadrado com raio e gradiente da
 * marca e, **dentro** dele, um contorno branco de 2px afastado das bordas --
 * é esse miolo vazado que dá a leitura de "olho".
 */
export default function MarcaArgos({ tamanho = "menu" }: MarcaArgosProps) {
  const m = MEDIDAS[tamanho];
  return (
    <Flex
      direction={m.direcao}
      align="center"
      gap={m.gap}
      p={tamanho === "menu" ? "20px 20px 16px" : undefined}
    >
      <Box
        position="relative"
        w={m.simbolo}
        h={m.simbolo}
        borderRadius={m.raio}
        flex="0 0 auto"
        bgGradient="to-br"
        gradientFrom="brand"
        gradientTo="brand.darker"
        _after={{
          content: '""',
          position: "absolute",
          /* Proporcional ao símbolo: 6px de recuo num quadrado de 26px vira
             um miolo grande demais num de 42px. */
          inset: tamanho === "menu" ? "6px" : "10px",
          border: "2px solid",
          borderColor: "white",
          borderRadius: "2px",
          opacity: 0.9,
        }}
      />
      <Text fontSize={m.palavra} fontWeight="800" letterSpacing="-0.01em" color="fg">
        Argos
      </Text>
    </Flex>
  );
}
