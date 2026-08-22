import { Button } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { BOTAO } from "../../theme/painelFiltro";

/** As variantes de `.btn` do artifact que o sistema usa de fato. */
export type VarianteBotao = "primario" | "ghost" | "perigo" | "perigoContorno";

interface Props extends Omit<ButtonProps, "variant"> {
  variante?: VarianteBotao;
  children: ReactNode;
}

const CORES: Record<VarianteBotao, ButtonProps> = {
  primario: {
    bg: "fg.brand",
    color: "white",
    borderColor: "transparent",
    _hover: { bg: "brand.dark" },
  },
  ghost: {
    bg: "transparent",
    color: "fg",
    borderColor: "border",
    _hover: { bg: "border.subtle" },
  },
  perigo: {
    bg: "status.bad",
    color: "white",
    borderColor: "transparent",
    _hover: { bg: "#b93a44" },
  },
  /** Contorno neutro com texto vermelho: a ação destrutiva não grita na
   * tela, mas o hover assume a cor. É o `.btn-danger-outline`. */
  perigoContorno: {
    bg: "transparent",
    color: "status.bad",
    borderColor: "border",
    _hover: { bg: "status.bad.bg", borderColor: "status.bad" },
  },
};

/** O botão do sistema (`.btn` do artifact): 9px 16px, raio 6, 13px/700.
 *
 * Um componente só para as quatro variantes -- antes o rodapé dos filtros
 * tinha a própria cópia dessas medidas, e os modais usavam as classes do
 * `index.css`. Três fontes para o mesmo botão divergem no primeiro ajuste.
 */
export default function Botao({ variante = "primario", children, ...resto }: Props) {
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
      {...CORES[variante]}
      {...resto}
    >
      {children}
    </Button>
  );
}
