import { Box, Input } from "@chakra-ui/react";

import IconeBusca from "../Icons/IconeBusca";

interface Props {
  rotulo: string;
  placeholder: string;
  valor: string;
  onMudar: (valor: string) => void;
  /** Teto de largura. O artifact usa 420px em Processos e 340px nas demais. */
  larguraMaxima?: string;
}

/** Campo de busca com a lupa por dentro (`.search-mini` do artifact).
 *
 * Existe como componente porque a mesma caixa aparece em Processos,
 * Clientes, Histórico e Grupo -- e porque acertar a lupa tem uma pegadinha:
 *
 * ⚠️ O `Input` do Chakra é `position: relative` pela receita, e vem depois
 * no DOM. Sem `zIndex` na lupa, o campo pinta POR CIMA dela e o ícone
 * simplesmente não aparece, mesmo estando no lugar certo e com a cor certa.
 */
export default function CampoDeBusca({
  rotulo,
  placeholder,
  valor,
  onMudar,
  larguraMaxima = "340px",
}: Props) {
  return (
    <Box position="relative" flex="1" minW="200px" maxW={larguraMaxima}>
      <Box
        position="absolute"
        zIndex="1"
        left="11px"
        top="50%"
        transform="translateY(-50%)"
        color="fg.subtle"
        pointerEvents="none"
        display="flex"
      >
        <IconeBusca />
      </Box>
      <Input
        aria-label={rotulo}
        w="100%"
        p="8px 12px 8px 34px"
        fontSize="14px"
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border"
        borderRadius="sm"
        _focusVisible={{ borderColor: "fg.brand", outline: "none" }}
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        placeholder={placeholder}
      />
    </Box>
  );
}
