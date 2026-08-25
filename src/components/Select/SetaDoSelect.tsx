import { components } from "react-select";
import type { DropdownIndicatorProps, GroupBase } from "react-select";

import IconeChevron from "../Icons/IconeChevron";
import type { OpcaoDeSelect } from "../../types";

/** A seta do select padrão, que gira ao abrir -- como no artifact.
 *
 * Só na variante `padrao`, que é a de FORMULÁRIO: ali a seta diz "isto é um
 * campo de escolher", que é o que distingue um select de um texto qualquer.
 * As pílulas de filtro não têm seta nenhuma -- ver `PilulaDeFiltro`. */
export function SetaDoSelect(props: DropdownIndicatorProps<OpcaoDeSelect, boolean, GroupBase<OpcaoDeSelect>>) {
  return (
    <components.DropdownIndicator
      {...props}
      innerProps={{
        ...props.innerProps,
        style: {
          display: "flex",
          color: "var(--chakra-colors-fg-subtle)",
          transition: "transform .15s",
          transform: props.selectProps.menuIsOpen ? "rotate(180deg)" : undefined,
        },
      }}
    >
      <IconeChevron />
    </components.DropdownIndicator>
  );
}
