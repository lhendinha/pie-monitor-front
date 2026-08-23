import { Button } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import { forwardRef } from "react";
import type { ReactNode } from "react";

import { PILULA, coresPilula } from "../../theme/pilula";

/** ⚠️ Estende `ButtonProps` porque o componente já faz spread de `...resto`
 * no `Button` -- a tipagem não declarava isso, então passar `onClick` (ou
 * qualquer atributo de botão) era erro de compilação num componente que
 * aceitava perfeitamente em runtime. */
interface PilulaDeFiltroProps extends ButtonProps {
  /** Muda a cor: filtro escolhido fica em azul claro, como no artifact. */
  ativo: boolean;
  /** Some com a seta de "abre um painel".
   *
   * A pílula nasceu como GATILHO de painel, e a seta anuncia isso. Numa
   * pílula que só ALTERNA (o "Sem arquivadas" do Kanban), ela promete um
   * menu que não existe -- a pessoa clica esperando escolher e o estado
   * muda embaixo dela. */
  semSeta?: boolean;
  children: ReactNode;
}

/** A pílula da barra de filtros (`.chip-btn` do artifact).
 *
 * Os filtros de situação, fase e cliente desenham esta mesma pílula pelo
 * `react-select` (`estilosChip`, que lê as mesmas medidas de
 * `theme/pilula`); este componente é para os que não passam por ele.
 *
 * `forwardRef` porque ela é usada como gatilho de `Popover`, e a lib precisa
 * da referência do elemento para posicionar e para saber o que é "dentro".
 */
export const PilulaDeFiltro = forwardRef<HTMLButtonElement, PilulaDeFiltroProps>(
  function PilulaDeFiltro({ ativo, semSeta, children, ...resto }, ref) {
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
        {!semSeta && <span aria-hidden="true">▾</span>}
      </Button>
    );
  },
);
