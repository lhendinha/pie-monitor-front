import { components } from "react-select";
import type { DropdownIndicatorProps, GroupBase } from "react-select";

import IconeChevron from "../Icons/IconeChevron";
import type { Opcao } from "./types";

/** A seta do select padrão, que gira ao abrir -- como no artifact.
 *
 * Os filtros em pílula não a usam (lá o glifo `▾` faz parte do rótulo), por
 * isso ela é ligada só na variante padrão. */
export function SetaDoSelect(props: DropdownIndicatorProps<Opcao, boolean, GroupBase<Opcao>>) {
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
