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
  /** 🔴 `bg.surface`, e NÃO `transparent`. Medido no Chrome: transparente
   * sobre o canvas (#f5f7f9) fazia o botão de contorno sair CINZA ao lado
   * das pílulas brancas -- visível em "Exportar planilha", no Kanban e em
   * "Limpar filtros". Dentro de modal e de cartão, que já são brancos, não
   * muda um pixel: é o mesmo branco. */
  ghost: {
    bg: "bg.surface",
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
   * tela, mas o hover assume a cor. É o `.btn-danger-outline`.
   *
   * ⚠️ Branco pelo mesmo motivo do `ghost` logo acima -- os dois são
   * botões de CONTORNO, e um par em que só metade acompanha o fundo é
   * pior que os dois errados. */
  perigoContorno: {
    bg: "bg.surface",
    color: "status.bad",
    borderColor: "border",
    _hover: { bg: "status.bad.bg", borderColor: "status.bad" },
  },
};
