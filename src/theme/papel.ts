import type { ButtonProps } from "@chakra-ui/react";

import type { Papel } from "../types";

/** Cor da etiqueta de cada papel (`.role-*` do artifact).
 *
 * Vive no tema e não dentro do componente pela mesma razão do
 * `CORES_DO_BOTAO`: é dado de design, e dado tem lugar. A escala não é
 * aleatória -- o papel mais alto usa a cor da marca, e os demais descem por
 * tons de status até o cinza do `user`. `financeiro` é o único fora dessa
 * escada, em violeta: ele não é "meio manager", é outra coisa.
 *
 * 🔴 O texto usa SEMPRE a variante escura (`.text`), nunca a cor cheia.
 * `admin` e `manager` apontavam para `status.good` e `status.warn` --
 * 3,12:1 e 3,00:1 sobre o próprio tint, numa etiqueta de 11px/800. O defeito
 * era irmão do que criou os `*Dark`, e escapou porque o guarda de contraste
 * só olhava para as cores do ATENDIMENTO. Agora olha para este mapa também.
 */
export const CORES_DO_PAPEL: Record<Papel, Pick<ButtonProps, "bg" | "color">> = {
  super_admin: { bg: "bg.brand.subtle", color: "brand.darker" },
  admin: { bg: "status.good.bg", color: "status.good.text" },
  manager: { bg: "status.warn.bg", color: "status.warn.text" },
  financeiro: { bg: "roxo.tint", color: "roxo.dark" },
  user: { bg: "border.subtle", color: "fg.muted" },
};
