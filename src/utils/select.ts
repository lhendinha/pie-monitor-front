import type { GroupBase, StylesConfig } from "react-select";
import { Z_INDEX_MENU_PORTAL } from "../constants/select";
import { ALTURA_MAXIMA_MENU } from "../constants/select";
import { MENSAGEM_VAZIA, OPCAO_CAIXA, OPCAO_LINHA, PAINEL } from "../theme/painelFiltro";
import { PILULA, coresPilula } from "../theme/pilula";
import { cores, raios, sombras } from "../theme/tokens";
import type { FormaDaOpcaoDeSelect, OpcaoDeSelect } from "../types";


function estiloDaOpcao(forma: FormaDaOpcaoDeSelect, selecionada: boolean, focada: boolean) {
  if (forma === "linha") {
    return {
      gap: 0,
      padding: OPCAO_LINHA.padding,
      borderRadius: raios.sm,
      fontSize: OPCAO_LINHA.fonte,
      fontWeight: selecionada ? OPCAO_LINHA.pesoAtiva : OPCAO_LINHA.peso,
      color: selecionada ? cores.brandDarker : cores.ink,
      background: selecionada ? cores.brandTint : "transparent",
      // Realce só no ponteiro, não em `isFocused`: o react-select foca a
      // primeira opção ao abrir, e o artifact abre o painel sem nada
      // realçado -- a primeira linha parecia pré-selecionada.
      "&:hover": { background: selecionada ? cores.brandTint : cores.canvas },
    };
  }
  return {
    gap: OPCAO_CAIXA.gap,
    padding: OPCAO_CAIXA.padding,
    fontSize: OPCAO_CAIXA.fonte,
    fontWeight: OPCAO_CAIXA.peso,
    color: cores.ink,
    background: focada ? cores.line2 : "transparent",
  };
}

export function estilosMenuPortal(base: Record<string, unknown>) {
  return { ...base, zIndex: Z_INDEX_MENU_PORTAL };
}

/** Estilos do select padrão (`.csel-trigger` / `.csel-panel` do artifact).
 *
 * Substitui o mapa de classes do design antigo -- era de lá que
 * vinha a borda bege do "Por página", herdada da paleta antiga. Aqui os
 * valores saem de `theme/tokens`, a única fonte de cor do projeto. */
export function estilosSelect(
  compacto: boolean,
  /** Nada escolhido -- inclui o caso em que a opção escolhida é a "vazia"
   * ("Nenhuma"/"Todos"). O artifact trata os dois igual: `.csel-trigger`
   * ganha a classe `placeholder` e o texto vai pra cinza em peso 500, em
   * vez do `ink` em 600 de um valor de verdade. Sem isso "Nenhuma" parecia
   * uma escolha feita. */
  semValor = false,
): StylesConfig<OpcaoDeSelect, boolean, GroupBase<OpcaoDeSelect>> {
  return {
    control: (base, estado) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      minHeight: "auto",
      padding: compacto ? "6px 8px" : "9px 12px",
      border: `1px solid ${estado.isFocused ? cores.brand : cores.line}`,
      borderRadius: raios.sm,
      background: cores.surface,
      fontWeight: semValor ? 500 : 600,
      fontSize: compacto ? 12.5 : 13,
      color: semValor ? cores.slate2 : cores.ink,
      textAlign: "left" as const,
      cursor: "pointer",
      boxShadow: estado.isFocused ? `0 0 0 3px ${cores.brandTint}` : "none",
      "&:hover": { borderColor: cores.brand },
    }),
    menu: (base) => ({
      ...base,
      marginTop: 4,
      background: cores.surface,
      border: `1px solid ${cores.line}`,
      borderRadius: raios.md,
      boxShadow: sombras.md,
      overflow: "hidden",
    }),
    menuList: (base) => ({ ...base, maxHeight: 250, padding: 5 }),
    option: (base, estado) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 9px",
      borderRadius: raios.sm,
      fontSize: 13,
      fontWeight: 600,
      color: estado.isSelected ? cores.brandDarker : cores.ink,
      background: estado.isSelected ? cores.brandTint : estado.isFocused ? cores.canvas : "transparent",
      cursor: "pointer",
    }),
    placeholder: (base) => ({ ...base, color: cores.slate2, fontWeight: 500 }),
    noOptionsMessage: (base) => ({
      ...base,
      padding: MENSAGEM_VAZIA.padding,
      fontSize: MENSAGEM_VAZIA.fonte,
      color: cores.slate,
      textAlign: "center" as const,
    }),
    menuPortal: estilosMenuPortal,
  };
}

export function semOpcoesDisponiveis() {
  return "Nenhuma opção disponível.";
}

export function rotuloResumo(selecionados: readonly OpcaoDeSelect[], placeholder: string) {
  if (selecionados.length === 0) return placeholder;
  if (selecionados.length <= 2) return selecionados.map((o) => o.label).join(", ");
  return `${selecionados.length} selecionados`;
}

/** Estilos da variante "chip": o controle vira a pílula do artifact.
 *
 * Vai em `styles` e não em `classNames` de propósito -- o mapa por classe
 * apontava pro design antigo. Aqui os valores vêm de
 * `theme/tokens`, que é a única fonte de cor do projeto.
 *
 * `controlShouldRenderValue={false}` no componente cuida do resto: a pílula
 * mantém o rótulo ("Todas as situações") em vez de virar uma fileira de
 * tags, que é o comportamento padrão do react-select em modo múltiplo e não
 * é o que o artifact mostra.
 */
export function estilosChip(
  temSelecao: boolean,
  formaDaOpcao: FormaDaOpcaoDeSelect = "caixa",
): StylesConfig<OpcaoDeSelect, boolean, GroupBase<OpcaoDeSelect>> {
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
      // Mesmo realce da pílula de datas (`PilulaDeFiltro`): sem isto, três
      // dos quatro chips não reagiam ao ponteiro e um reagia.
      "&:hover": { borderColor: cores.brand },
    }),
    menu: (base) => ({
      ...base,
      marginTop: PAINEL.margemTopo,
      // 340px medido no artifact -- com menos que isso os rótulos de
      // situação quebram em duas linhas.
      width: PAINEL.largura,
      background: cores.surface,
      border: `1px solid ${cores.line}`,
      borderRadius: raios.md,
      boxShadow: sombras.md,
      overflow: "hidden",
    }),
    menuList: (base) => ({ ...base, maxHeight: ALTURA_MAXIMA_MENU, padding: "0 2px" }),
    option: (base, estado) => ({
      ...base,
      ...estiloDaOpcao(formaDaOpcao, estado.isSelected, estado.isFocused),
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
    }),
    placeholder: (base) => ({ ...base, color: "inherit" }),
    noOptionsMessage: (base) => ({
      ...base,
      padding: MENSAGEM_VAZIA.padding,
      fontSize: MENSAGEM_VAZIA.fonte,
      color: cores.slate,
      textAlign: "center" as const,
    }),
    menuPortal: estilosMenuPortal,
  };
}
