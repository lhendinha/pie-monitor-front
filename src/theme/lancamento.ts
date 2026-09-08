import type { ButtonProps } from "@chakra-ui/react";

import {
  NATUREZA_ENTRADA,
  SITUACAO_ABERTO,
  SITUACAO_ATRASADO,
  SITUACAO_EFETIVADO,
} from "../constants";

/** Cores da etiqueta de situação do lançamento.
 *
 * 🔴 **Efetivado em verde, aberto em âmbar, atrasado em vermelho.** O verde
 * é o resolvido -- o dinheiro entrou ou saiu de verdade --, o âmbar é o que
 * ainda vai acontecer, e o vermelho é o que já devia ter acontecido. Trocar
 * o âmbar pelo cinza faria "a receber" parecer inerte, quando é justamente
 * a fila de trabalho de quem cuida do dinheiro.
 *
 * ⚠️ `status.*.text` e não a cor cheia: a `Etiqueta` é 11px/800, texto
 * pequeno, e a cor cheia sobre o tint reprova em AA. Mesma nota de
 * `theme/atendimento.ts`.
 *
 * ⚠️ Vive no tema, ao lado de `atendimento.ts`, `papel.ts` e `envio.ts`,
 * porque é a mesma decisão -- que cor tem cada estado.
 */
export const CORES_DA_SITUACAO: Record<string, Pick<ButtonProps, "bg" | "color">> = {
  [SITUACAO_EFETIVADO]: { bg: "status.good.bg", color: "status.good.text" },
  [SITUACAO_ABERTO]: { bg: "status.warn.bg", color: "status.warn.text" },
  [SITUACAO_ATRASADO]: { bg: "status.bad.bg", color: "status.bad.text" },
};

/** Situação desconhecida não pode sumir da tela nem herdar a cor de outra --
 * um valor novo no servidor apareceria em branco e ilegível. */
export const COR_DE_SITUACAO_PADRAO: Pick<ButtonProps, "bg" | "color"> = {
  bg: "border.subtle",
  color: "fg.muted",
};

export function coresDaSituacao(situacao: string) {
  return CORES_DA_SITUACAO[situacao] ?? COR_DE_SITUACAO_PADRAO;
}

/** A cor do VALOR na linha: verde entra, vermelho sai.
 *
 * 🔴 É a leitura do extrato, e a mesma da natureza da categoria. A
 * transferência não tem natureza -- o dinheiro só muda de conta --, e por
 * isso fica no cinza do texto comum: pintá-la de verde ou vermelho diria
 * que o escritório ganhou ou perdeu algo.
 */
export function corDoValor(natureza: string): string {
  if (!natureza) return "fg";
  return natureza === NATUREZA_ENTRADA ? "status.good.text" : "status.bad.text";
}

/** O sinal que vai antes do número: `+` entra, `−` sai, nada na
 * transferência.
 *
 * ⚠️ É o MENOS de verdade (U+2212), não o hífen: no mesmo tamanho de fonte o
 * hífen fica curto e alto, e numa coluna de números alinhados isso aparece.
 */
export function sinalDoValor(natureza: string): string {
  if (!natureza) return "";
  return natureza === NATUREZA_ENTRADA ? "+" : "−";
}
