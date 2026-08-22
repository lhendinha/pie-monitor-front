import { Box, HStack, Text } from "@chakra-ui/react";

/** A marca no topo do menu lateral (`.brand` do artifact).
 *
 * O símbolo não é um quadrado chapado: é um quadrado de 26px com raio 7 e
 * gradiente da marca, e **dentro** dele um contorno branco de 2px afastado
 * 6px de cada lado (o `::after` do artifact) -- é esse miolo vazado que dá
 * a leitura de "olho".
 */
export default function MarcaArgos() {
  return (
    <HStack gap="10px" p="20px 20px 16px">
      <Box
        position="relative"
        w="26px"
        h="26px"
        borderRadius="7px"
        flex="0 0 auto"
        bgGradient="to-br"
        gradientFrom="brand"
        gradientTo="brand.darker"
        _after={{
          content: '""',
          position: "absolute",
          inset: "6px",
          border: "2px solid",
          borderColor: "white",
          borderRadius: "2px",
          opacity: 0.9,
        }}
      />
      <Text fontSize="17px" fontWeight="800" letterSpacing="-0.01em" color="fg">
        Argos
      </Text>
    </HStack>
  );
}
