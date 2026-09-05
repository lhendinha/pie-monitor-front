import type { ButtonProps } from "@chakra-ui/react";

/** Cores da etiqueta de status do atendimento (`.status-*` do artifact).
 *
 * 🔴 **"Em andamento" em âmbar, "Fechado" em azul da marca.** O âmbar é o
 * "pede atenção" (atendimento aberto é trabalho em curso, que ainda vai
 * voltar), e o azul marca o resolvido. Pintar o aberto de azul e o fechado
 * de cinza inverte o que cada cor SIGNIFICA -- e o mapa e este texto têm de
 * mudar juntos, porque é o comentário que a próxima pessoa lê antes do
 * código.
 *
 * ⚠️ **`status.warn.text`, não `status.warn`.** A `Etiqueta` é 11px/800, ou
 * seja texto pequeno: a cor cheia sobre o tint dá 3,00:1 e reprova em AA.
 * Ver `theme/tokens.ts`.
 *
 * Vive no tema, ao lado de `papel.ts` e `envio.ts`, porque é a mesma decisão
 * -- que cor tem cada estado -- e as telas que mostram status leem daqui.
 */
export const CORES_DO_STATUS: Record<string, Pick<ButtonProps, "bg" | "color">> = {
  "Em andamento": { bg: "status.warn.bg", color: "status.warn.text" },
  Fechado: { bg: "bg.brand.subtle", color: "brand.darker" },
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
