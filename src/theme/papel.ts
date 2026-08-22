import type { ButtonProps } from "@chakra-ui/react";

import type { Papel } from "../types";

/** Cor da etiqueta de cada papel (`.role-*` do artifact).
 *
 * Vive no tema e não dentro do componente pela mesma razão do
 * `CORES_DO_BOTAO`: é dado de design, e dado tem lugar. A escala não é
 * aleatória -- o papel mais alto usa a cor da marca, e os demais descem por
 * tons de status até o cinza do `user`.
 */
export const CORES_DO_PAPEL: Record<Papel, Pick<ButtonProps, "bg" | "color">> = {
  super_admin: { bg: "bg.brand.subtle", color: "brand.darker" },
  admin: { bg: "status.good.bg", color: "status.good" },
  manager: { bg: "status.warn.bg", color: "status.warn" },
  user: { bg: "border.subtle", color: "fg.muted" },
};
