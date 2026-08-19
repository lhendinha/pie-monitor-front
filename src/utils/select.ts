import type { ClassNamesConfig, GroupBase } from "react-select";
import { Z_INDEX_MENU_PORTAL } from "../constants/select";
import type { Opcao } from "../components/Select/types";

export function estilosMenuPortal(base: Record<string, unknown>) {
  return { ...base, zIndex: Z_INDEX_MENU_PORTAL };
}

export function criarClassNames(compacto: boolean): ClassNamesConfig<Opcao, boolean, GroupBase<Opcao>> {
  return {
    control: (state) =>
      ["select-control", compacto && "select-control--compacto", state.isFocused && "select-control--focado"]
        .filter(Boolean)
        .join(" "),
    menu: () => "select-menu",
    menuList: () => "select-menu-lista",
    option: (state) =>
      ["select-opcao", state.isSelected && "select-opcao--selecionada", state.isFocused && "select-opcao--focada"]
        .filter(Boolean)
        .join(" "),
    placeholder: () => "muted",
    noOptionsMessage: () => "select-vazio muted",
  };
}

export function semOpcoesDisponiveis() {
  return "Nenhuma opção disponível.";
}

export function rotuloResumo(selecionados: readonly Opcao[], placeholder: string) {
  if (selecionados.length === 0) return placeholder;
  if (selecionados.length <= 2) return selecionados.map((o) => o.label).join(", ");
  return `${selecionados.length} selecionados`;
}
