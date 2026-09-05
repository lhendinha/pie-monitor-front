import { Flex } from "@chakra-ui/react";

import Botao from "../Botao";
import { RODAPE } from "../../theme/painelFiltro";
import type { RodapeDeFiltroProps } from "./types";

/** Rodapé `.filter-actions` do artifact: divisória em cima, botões à
 * direita.
 *
 * Existe como componente porque aparece igual em dois painéis (situação/
 * fase e datas) -- e os dois passam a confirmar a escolha em vez de aplicar
 * a cada clique, que é o que evita uma requisição por caixa marcada.
 */
export default function RodapeDeFiltro({
  rotuloSecundario,
  onSecundario,
  onAplicar,
  aplicarDesabilitado,
}: RodapeDeFiltroProps) {
  return (
    <Flex
      justify="flex-end"
      gap={RODAPE.gap}
      p={RODAPE.padding}
      mt={RODAPE.margemTopo}
      borderTopWidth="1px"
      borderTopStyle="solid"
      borderTopColor="border.subtle"
    >
      <Botao variante="ghost" onClick={onSecundario}>
        {rotuloSecundario}
      </Botao>
      <Botao variante="primario" onClick={onAplicar} disabled={aplicarDesabilitado}>
        Aplicar
      </Botao>
    </Flex>
  );
}
