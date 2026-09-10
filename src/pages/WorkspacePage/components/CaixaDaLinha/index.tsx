import { Checkbox } from "@chakra-ui/react";

import type { CaixaDaLinhaProps } from "./types";

/** A caixa de marcar de uma linha de tarefa.
 *
 * 🔴 O Shift do teclado é lido do EVENTO DE CLIQUE, não do
 * `onCheckedChange` -- aquele recebe só o estado novo, sem o modificador, e
 * é onde o Shift+clique morreria em silêncio. Por isso o `onClick` vive no
 * `Checkbox.Root`.
 *
 * ⚠️ O `aria-label` carrega o TÍTULO da tarefa. Sem ele, quem usa leitor de
 * tela ouve "caixa de seleção" doze vezes seguidas e não sabe qual é qual.
 */
export default function CaixaDaLinha({ tarefa, marcada, ordem, onAlternar }: CaixaDaLinhaProps) {
  return (
    <Checkbox.Root
      checked={marcada}
      onClick={(evento) => {
        /* O Chakra já alterna sozinho pelo clique; o `preventDefault` é o que
           impede a dupla troca (a nossa, e a dele). */
        evento.preventDefault();
        onAlternar(tarefa, ordem, evento.shiftKey);
      }}
      aria-label={`Selecionar ${tarefa.titulo}`}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
    </Checkbox.Root>
  );
}
