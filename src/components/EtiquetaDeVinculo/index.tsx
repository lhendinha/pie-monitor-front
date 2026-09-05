import { Flex, Text, chakra } from "@chakra-ui/react";
import type { EtiquetaDeVinculoProps } from "./types";


const BotaoRemover = chakra("button", {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    bg: "transparent",
    borderWidth: "0",
    padding: "0",
    cursor: "pointer",
    color: "fg.subtle",
    lineHeight: "1",
    // Mesmo "✕" literal do fechar do modal -- não existe componente de
    // ícone pra ele no projeto, e inventar um só aqui divergiria.
    fontSize: "11px",
    _hover: { color: "status.bad" },
  },
});

/** O vínculo já escolhido, com o × que o desfaz.
 *
 * Carrega o TIPO junto do nome ("Processo · 0000123-45…"): com um processo
 * e um atendimento lado a lado, o número e o assunto não dizem sozinhos
 * qual é qual.
 *
 * ⚠️ Mora em `components/`, e não dentro de `ModalDeTarefa/`, desde que o
 * documento passou a usar o mesmo campo de vínculo. Enquanto estava lá
 * dentro, um componente de alcance geral vivia na pasta de UM modal --
 * e o segundo consumidor teria que importar por `../ModalDeTarefa/…`,
 * que é o formato de import que anuncia uma pasta no lugar errado.
 */
export default function EtiquetaDeVinculo({ vinculo, onRemover }: EtiquetaDeVinculoProps) {
  const tipo = vinculo.tipo === "processo" ? "Processo" : "Atendimento";
  return (
    <Flex
      align="center"
      gap="7px"
      px="9px"
      py="5px"
      borderRadius="full"
      borderWidth="1px"
      borderColor="border"
      bg="bg.canvas"
      maxW="100%"
    >
      <Text fontSize="11.5px" fontWeight="800" color="fg.subtle" flexShrink="0">
        {tipo}
      </Text>
      <Text fontSize="12px" fontWeight="700" color="fg" truncate>
        {vinculo.rotulo}
      </Text>
      <BotaoRemover type="button" aria-label={`Remover ${tipo} ${vinculo.rotulo}`} onClick={onRemover}>
        ✕
      </BotaoRemover>
    </Flex>
  );
}
