import type { ReactNode } from "react";

import { BotaoNu } from "../BotaoNu";
import { OPCAO_LINHA } from "../../theme/painelFiltro";

interface Props {
  ativa: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Linha de opção que ocupa a largura toda do painel (`.period-opt`).
 *
 * É a "Todas as situações" no topo dos painéis de múltipla escolha -- a
 * mesma forma que o artifact usa, e por isso mora fora do `MenuDeFiltro`.
 */
export function OpcaoDeLinha({ ativa, onClick, children }: Props) {
  return (
    <BotaoNu
      type="button"
      onClick={onClick}
      display="block"
      w="100%"
      p={OPCAO_LINHA.padding}
      borderRadius={OPCAO_LINHA.raio}
      fontSize={OPCAO_LINHA.fonte}
      fontWeight={ativa ? OPCAO_LINHA.pesoAtiva : OPCAO_LINHA.peso}
      color={ativa ? "brand.darker" : "fg"}
      bg={ativa ? "bg.brand.subtle" : "transparent"}
      _hover={{ bg: ativa ? "bg.brand.subtle" : "bg.canvas" }}
    >
      {children}
    </BotaoNu>
  );
}
