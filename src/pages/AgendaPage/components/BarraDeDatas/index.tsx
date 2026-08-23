import { Flex, Text } from "@chakra-ui/react";

import { Botao, BotaoQuadrado, IconeChevron } from "../../../../components";

interface Props {
  rotulo: string;
  onNavegar: (passo: number) => void;
  onHoje: () => void;
}

/** As setas, o rótulo do período e o "Hoje" (`.agenda-datebar` do artifact).
 *
 * O chevron é girado em vez de haver dois ícones: é a mesma seta, e um
 * segundo arquivo divergiria do primeiro no próximo ajuste de traço.
 */
export default function BarraDeDatas({ rotulo, onNavegar, onHoje }: Props) {
  return (
    <Flex align="center" gap="10px" mb="14px">
      <BotaoQuadrado type="button" aria-label="Período anterior" onClick={() => onNavegar(-1)}>
        <Flex transform="rotate(90deg)">
          <IconeChevron />
        </Flex>
      </BotaoQuadrado>
      <BotaoQuadrado type="button" aria-label="Próximo período" onClick={() => onNavegar(1)}>
        <Flex transform="rotate(-90deg)">
          <IconeChevron />
        </Flex>
      </BotaoQuadrado>

      {/* Sem `text-transform: capitalize`: ele capitalizaria cada palavra
          ("Agosto De 2026"). Quem põe a maiúscula certa é `rotuloDoPeriodo`. */}
      <Text fontWeight="800" fontSize="15px">
        {rotulo}
      </Text>

      {/* `ghost` é o `.btn.btn-ghost` do artifact -- "Hoje" volta pra data
          de hoje, não é a ação principal da tela. */}
      <Flex ml="auto">
        <Botao variante="ghost" type="button" onClick={onHoje} px="14px" py="7px">
          Hoje
        </Botao>
      </Flex>
    </Flex>
  );
}
