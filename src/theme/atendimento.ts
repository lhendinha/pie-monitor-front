import type { ButtonProps } from "@chakra-ui/react";

/** Cores da etiqueta de status do atendimento (`.status-*` do artifact).
 *
 * "Em andamento" em azul da marca, "Fechado" em cinza: o que está aberto
 * pede atenção, o fechado só precisa ser reconhecível. Vive no tema, ao lado
 * de `papel.ts` e `envio.ts`, porque é a mesma decisão -- que cor tem cada
 * estado -- e as três telas que mostram status leriam daqui.
 */
export const CORES_DO_STATUS: Record<string, Pick<ButtonProps, "bg" | "color">> = {
  "Em andamento": { bg: "bg.brand.subtle", color: "brand.darker" },
  Fechado: { bg: "border.subtle", color: "fg.muted" },
};

/** Status desconhecido não pode sumir da tela nem herdar a cor de outro --
 * um valor novo no servidor apareceria em branco e ilegível. */
export const COR_DE_STATUS_PADRAO: Pick<ButtonProps, "bg" | "color"> = {
  bg: "border.subtle",
  color: "fg.muted",
};

export function coresDoStatus(status: string) {
  return CORES_DO_STATUS[status] ?? COR_DE_STATUS_PADRAO;
}
