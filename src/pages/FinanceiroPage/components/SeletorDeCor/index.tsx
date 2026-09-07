import { Box } from "@chakra-ui/react";

import { BotaoNu } from "../../../../components";
import type { SeletorDeCorProps } from "./types";

/** A paleta de cores da categoria (`.cores` do artifact).
 *
 * ⚠️ **A paleta vem do SERVIDOR** (`cores_disponiveis` do catálogo), e não
 * de uma lista escrita aqui: é a mesma paleta que a API usa para recusar
 * "Cor fora da paleta", e duas listas divergiriam no primeiro acréscimo --
 * a tela ofereceria uma cor que o servidor rejeita.
 *
 * ⚠️ **`BotaoNu`, e não `Box as="button"`**: a tipagem do Chakra não aceita
 * `type` no `Box`, e botão sem `type="button"` dentro de formulário vira
 * submit -- este mora dentro do form do modal.
 *
 * ⚠️ **Botões, não `input[type=radio]`.** O artifact desenha quadrados
 * clicáveis de 2px de borda transparente que ganham `border-color` quando
 * escolhidos; um rádio traria a marca do navegador por cima da cor. O que o
 * rádio daria de graça -- estado lido em voz alta e navegação por seta -- vem
 * do `aria-pressed` e da ordem natural de tabulação.
 *
 * 🔴 O `aria-label` diz a cor em HEXADECIMAL, que é feio de ouvir e é o
 * honesto: as cores da paleta não têm nome no sistema, e inventar "verde" e
 * "verde-escuro" para dois tons próximos confundiria mais que o código.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function SeletorDeCor({ cores, escolhida, onEscolher, id }: SeletorDeCorProps) {
  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(10, 1fr)"
      gap="6px"
      role="group"
      aria-label="Cor da categoria"
    >
      {cores.map((cor, indice) => (
        <BotaoNu
          type="button"
          key={cor}
          id={indice === 0 ? id : undefined}
          aria-label={`Cor ${cor}`}
          aria-pressed={cor === escolhida}
          onClick={() => onEscolher(cor)}
          bg={cor}
          w="100%"
          aspectRatio="1"
          p="0"
          borderRadius="6px"
          borderWidth="2px"
          borderStyle="solid"
          borderColor={cor === escolhida ? "fg" : "transparent"}
        />
      ))}
    </Box>
  );
}
