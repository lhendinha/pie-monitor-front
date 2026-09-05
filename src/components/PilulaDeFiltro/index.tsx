import { Button } from "@chakra-ui/react";
import { forwardRef } from "react";

import { PILULA, coresPilula } from "../../theme/pilula";
import type { PilulaDeFiltroProps } from "./types";

/** A pílula da barra de filtros (`.chip-btn` do artifact).
 *
 * 🔴 **Sem seta.** Ela existiu aqui e não existia nas pílulas desenhadas
 * pelo react-select, que são a maioria -- então metade do conjunto anunciava
 * "abre um painel" e a outra metade abria o mesmo painel calada. E na do
 * Kanban que só ALTERNA ("Sem arquivadas") a seta prometia um menu que não
 * existe: a pessoa clicava esperando escolher e o estado mudava embaixo
 * dela. Havia um `semSeta` pra desligá-la caso a caso; um enfeite que
 * precisa de exceção em cada uso é enfeite errado. Quem anuncia a ação
 * agora é o X, que só aparece quando há o que limpar -- e faz alguma coisa.
 *
 * Os filtros de situação, fase e cliente desenham esta mesma pílula pelo
 * `react-select` (`estilosChip`, que lê as mesmas medidas de
 * `theme/pilula`); este componente é para os que não passam por ele.
 *
 * `forwardRef` porque ela é usada como gatilho de `Popover`, e a lib precisa
 * da referência do elemento para posicionar e para saber o que é "dentro".
 */
export const PilulaDeFiltro = forwardRef<HTMLButtonElement, PilulaDeFiltroProps>(
  function PilulaDeFiltro({ ativo, children, ...resto }, ref) {
    const cor = coresPilula(ativo);
    return (
      <Button
        ref={ref}
        type="button"
        /* O estado "ligado" só existe como COR. Sem um atributo, nem teste
           nem verificação em navegador conseguem afirmar que a pílula está
           acesa sem comparar hex de fundo. */
        data-ativo={ativo || undefined}
        display="inline-flex"
        alignItems="center"
        gap={PILULA.gap}
        h="auto"
        px={PILULA.paddingX}
        py={PILULA.paddingY}
        borderRadius={PILULA.raio}
        borderWidth="1px"
        borderStyle="solid"
        borderColor={cor.borda}
        bg={cor.fundo}
        color={cor.texto}
        fontWeight={PILULA.peso}
        fontSize={PILULA.fonte}
        letterSpacing={PILULA.espacamento}
        textTransform="uppercase"
        whiteSpace="nowrap"
        _hover={{ borderColor: "fg.brand" }}
        {...resto}
      >
        {children}
      </Button>
    );
  },
);
