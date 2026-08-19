import { components } from "react-select";
import type { GroupBase, OptionProps } from "react-select";
import type { Opcao } from "./types";

/** Checkbox em cada opção -- delega o `<div>`/innerProps pro `Option`
 * padrão da lib, só troca o conteúdo interno. O `onChange` do checkbox é
 * no-op de propósito: o toggle real acontece no clique do `Option`
 * (via `innerProps`); se o checkbox também reagisse ao seu próprio
 * `onChange`, o clique dispararia dois toggles e cancelaria a si mesmo. */
export function OpcaoComCheckbox(props: OptionProps<Opcao, true, GroupBase<Opcao>>) {
  return (
    <components.Option {...props}>
      <input type="checkbox" checked={props.isSelected} onChange={() => {}} tabIndex={-1} readOnly />
      {props.label}
    </components.Option>
  );
}
