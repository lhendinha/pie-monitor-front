import type { ButtonProps } from "@chakra-ui/react";

import type { VarianteBotao } from "../types";

/** Cores de cada variante do botão.
 *
 * Vive no tema e não dentro do componente pela mesma razão de `pilula.ts` e
 * `painelFiltro.ts`: é dado de design, e dado tem lugar. O componente
 * decide o formato (padding, raio, peso); aqui está só a paleta.
 */
export const CORES_DO_BOTAO: Record<VarianteBotao, ButtonProps> = {
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
