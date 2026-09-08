import type { ButtonProps } from "@chakra-ui/react";

import { FATURA_ABERTA, FATURA_CANCELADA, FATURA_PAGA } from "../constants";

/** Cores da etiqueta de situação da FATURA.
 *
 * 🔴 As mesmas quatro do lançamento, e pela mesma razão: verde é o
 * resolvido, âmbar o que ainda vai acontecer, vermelho o que já devia ter
 * acontecido. A cancelada é cinza -- ela não é boa nem ruim, ela saiu.
 *
 * ⚠️ `status.*.text` e não a cor cheia: a `Etiqueta` é 11px/800, e a cor
 * cheia sobre o tint reprova em AA. Mesma nota de `theme/lancamento.ts`.
 */
export function coresDaFatura(situacao: string): Pick<ButtonProps, "bg" | "color"> {
  if (situacao === FATURA_PAGA) return { bg: "status.good.bg", color: "status.good.text" };
  if (situacao === "atrasada") return { bg: "status.bad.bg", color: "status.bad.text" };
  if (situacao === FATURA_CANCELADA) return { bg: "bg.canvas", color: "fg.subtle" };
  return { bg: "status.warn.bg", color: "status.warn.text" };
}

/** ⚠️ `FATURA_ABERTA` entra pelo `return` de baixo, e não por um `if`: ela é
 * o caso comum, e a escada acabaria com um ramo por situação para dizer a
 * mesma coisa. */
export const SITUACOES_COM_COR = [FATURA_ABERTA, "atrasada", FATURA_PAGA, FATURA_CANCELADA];
