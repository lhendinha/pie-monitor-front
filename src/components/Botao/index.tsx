import { Button } from "@chakra-ui/react";

import { BOTAO } from "../../theme/painelFiltro";
import { CORES_DO_BOTAO } from "../../theme/botao";
import type { BotaoProps } from "./types";

/** O botão do sistema (`.btn` do artifact): 9px 16px, raio 6, 13px/700.
 *
 * Um componente só para as quatro variantes -- antes o rodapé dos filtros
 * tinha a própria cópia dessas medidas, e os modais usavam as classes do
 * design antigo. Três fontes para o mesmo botão divergem no primeiro ajuste.
 */
export default function Botao({ variante = "primario", children, ...resto }: BotaoProps) {
  return (
    <Button
      type="button"
      display="inline-flex"
      alignItems="center"
      gap={BOTAO.gap}
      h="auto"
      p={BOTAO.padding}
      borderRadius={BOTAO.raio}
      borderWidth="1px"
      fontSize={BOTAO.fonte}
      fontWeight={BOTAO.peso}
      whiteSpace="nowrap"
      /* `.btn svg{width:15px;height:15px}` do artifact. Precisa ser
         declarado: a receita do `Button` do Chakra dimensiona os SVGs
         descendentes e vence o atributo `width` do próprio ícone -- a
         lixeira do Excluir saía com 20px. */
      css={{ "& svg": { width: "15px", height: "15px" } }}
      {...CORES_DO_BOTAO[variante]}
      {...resto}
    >
      {children}
    </Button>
  );
}
