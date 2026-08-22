import type { ClassNamesConfig, GroupBase, StylesConfig } from "react-select";
import { Z_INDEX_MENU_PORTAL } from "../constants/select";
import { PILULA, coresPilula } from "../theme/pilula";
import { cores, raios, sombras } from "../theme/tokens";
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

/** Estilos da variante "chip": o controle vira a pílula do artifact.
 *
 * Vai em `styles` e não em `classNames` de propósito -- o mapa por classe
 * aponta pro `index.css`, que some no fim da Fase 2. Aqui os valores vêm de
 * `theme/tokens`, que é a única fonte de cor do projeto.
 *
 * `controlShouldRenderValue={false}` no componente cuida do resto: a pílula
 * mantém o rótulo ("Todas as situações") em vez de virar uma fileira de
 * tags, que é o comportamento padrão do react-select em modo múltiplo e não
 * é o que o artifact mostra.
 */
export function estilosChip(temSelecao: boolean): StylesConfig<Opcao, boolean, GroupBase<Opcao>> {
  return {
    control: (base) => ({
      ...base,
      display: "inline-flex",
      alignItems: "center",
      gap: PILULA.gap,
      minHeight: "auto",
      padding: `${PILULA.paddingY} ${PILULA.paddingX}`,
      borderRadius: PILULA.raio,
      border: `1px solid ${coresPilula(temSelecao).borda}`,
      background: coresPilula(temSelecao).fundo,
      color: coresPilula(temSelecao).texto,
      fontWeight: PILULA.peso,
      fontSize: PILULA.fonte,
      letterSpacing: PILULA.espacamento,
      textTransform: "uppercase",
      cursor: "pointer",
      whiteSpace: "nowrap",
    }),
    menu: (base) => ({
      ...base,
      marginTop: 6,
      minWidth: 216,
      background: cores.surface,
      border: `1px solid ${cores.line}`,
      borderRadius: raios.md,
      boxShadow: sombras.md,
      overflow: "hidden",
    }),
    option: (base, estado) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      fontSize: 13,
      fontWeight: 600,
      color: cores.ink,
      background: estado.isFocused ? cores.line2 : "transparent",
      cursor: "pointer",
    }),
    placeholder: (base) => ({ ...base, color: "inherit" }),
    menuPortal: estilosMenuPortal,
  };
}
