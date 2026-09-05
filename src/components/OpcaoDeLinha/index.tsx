
import { BotaoNu } from "../BotaoNu";
import { OPCAO_LINHA } from "../../theme/painelFiltro";
import type { OpcaoDeLinhaProps } from "./types";

/** Linha de opção que ocupa a largura toda do painel (`.period-opt`).
 *
 * É a "Todas as situações" no topo dos painéis de múltipla escolha e cada
 * opção do seletor de visão da Agenda -- a mesma forma (`.period-opt`) que o
 * artifact usa nos dois. Subiu de `Select/` pra cá quando ganhou o segundo
 * consumidor, fora do Select.
 */
export function OpcaoDeLinha({ ativa, onClick, children }: OpcaoDeLinhaProps) {
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
