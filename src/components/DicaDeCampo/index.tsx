import { Popover, Portal } from "@chakra-ui/react";

import { BotaoNu } from "../BotaoNu";
import type { DicaDeCampoProps } from "./types";

/** O "i" ao lado do rótulo de um campo, com a explicação atrás.
 *
 * 🔴 **É `Popover`, e NÃO `Tooltip`** -- a decisão está no plano de escala, e
 * a razão é dura: `Tooltip` abre por hover, e **hover não existe em toque**.
 * Uma explicação que só aparece com mouse é uma explicação que metade das
 * pessoas nunca vê -- e esta existe justamente para evitar um erro de
 * preenchimento.
 *
 * 🔴 **Só por CLIQUE -- hover foi TENTADO e removido em 30/08/2026.**
 *
 * A ideia era boa no papel: quem tem mouse não deveria clicar para ler uma
 * linha de ajuda. Na tela ficou ruim, e a medição explicou por quê. Aberto por
 * hover, o balão fica ancorado logo abaixo do "i" e o **posicionador dele
 * intercepta o ponteiro**: o segundo clique acertava o balão, não o botão --
 * o Playwright registrou literalmente *"positioner subtree intercepts pointer
 * events"*. Na prática, o balão abria sozinho ao passar o mouse e depois
 * resistia a fechar.
 *
 * ⚠️ Não vale tentar de novo sem resolver isso: hover que abre um elemento
 * por cima do próprio gatilho briga com o clique por definição.
 *
 * ⚠️ O gatilho é `BotaoNu`, e não `Box as="button"`: aquele não aceita `type`
 * na tipagem do Chakra, e botão sem `type="button"` dentro de formulário vira
 * SUBMIT por padrão do HTML -- clicar no "i" enviaria o formulário. O
 * docstring de `BotaoNu` conta que isso foi preciso três vezes antes de virar
 * um lugar só; esta seria a quarta.
 */
export default function DicaDeCampo({ rotulo, children }: DicaDeCampoProps) {
  return (
    <Popover.Root
      /* 🔴 **`lazyMount` + `unmountOnExit`, e é o defeito que o `SeletorData`
         já pagou.** Sem eles o posicionador continua montado depois de
         fechar, por cima da tela, e ENGOLE cliques: clicar fora não chegava a
         contar como "clique fora", e clicar no próprio "i" também não chegava
         -- o balão parecia não fechar nunca. O docstring do `SeletorData`
         descreve o mesmo sintoma com o calendário. */
      lazyMount
      unmountOnExit
      /* ⚠️ `bottom-start`: o gatilho tem 16px e o balão tem 300. Centralizado
         (o padrão), ele nasce ~142px para cada lado do "i" e sai do cartão --
         era a posição "esquisita". Alinhado pelo começo, ele cresce para o
         lado onde há espaço. `gutter` afasta do rótulo. */
      positioning={{ placement: "bottom-start", gutter: 6 }}
    >
      <Popover.Trigger asChild>
        <BotaoNu
          type="button"
          aria-label={rotulo}
          ml="5px"
          w="16px"
          h="16px"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          verticalAlign="middle"
          borderRadius="full"
          borderWidth="1px"
          borderColor="border"
          bg="bg.surface"
          color="fg.muted"
          fontSize="10.5px"
          fontWeight="800"
          lineHeight="1"
          cursor="pointer"
          _hover={{ borderColor: "fg.brand", color: "fg.brand" }}
        >
          i
        </BotaoNu>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w="300px"
            p="12px 14px"
            borderRadius="md"
            /* ⚠️ Peso e cor PRÓPRIOS: o gatilho fica ao lado de um `<label>`,
               que é 12.5px/700 em `ink`. Sem isto o balão herdaria o negrito
               do rótulo e viraria um bloco de texto em caixa forte. */
            fontSize="12.5px"
            fontWeight="400"
            color="fg.muted"
            lineHeight="1.5"
            textAlign="left"
          >
            {children}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
