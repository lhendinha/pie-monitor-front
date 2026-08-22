import { DatePicker, chakra } from "@chakra-ui/react";

import { CAMPO_DATA } from "../../theme/painelFiltro";

/** O campo que abre o calendário (`.dp-trigger` do artifact): 9px 12px,
 * raio 6px, 13px/600.
 *
 * ⚠️ É o `DatePicker.Trigger` da lib ESTILIZADO, e não um botão nosso
 * dentro de um `asChild`. Embrulhado, a lib perdia a referência do gatilho
 * e passava a ler o `pointerdown` nele como "clique fora": fechava o
 * calendário e o `click` seguinte reabria -- o campo não alternava. Só
 * aparecia em navegador com janela, nunca em headless.
 *
 * `w`/`h`/`minW` no `base` funcionam porque aqui não há receita de botão de
 * ícone competindo (era o caso quando o gatilho era um `<button>` solto).
 */
export const Gatilho = chakra(DatePicker.Trigger, {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: CAMPO_DATA.gap,
    width: "100%",
    minWidth: 0,
    height: CAMPO_DATA.altura,
    padding: CAMPO_DATA.padding,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: CAMPO_DATA.raio,
    bg: "bg.surface",
    fontWeight: CAMPO_DATA.peso,
    fontSize: CAMPO_DATA.fonte,
    color: "fg",
    textAlign: "left",
    cursor: "pointer",
    _hover: { borderColor: "fg.brand" },
    _focusVisible: { outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "2px" },
    // O ícone do calendário fica em cinza, e só ele -- o texto é `ink`.
    "& > svg": { color: "fg.subtle" },
  },
  variants: {
    /** Sem data escolhida, o campo se comporta como placeholder -- mesmo
     * cinza e mesmo peso dos selects (`.csel-trigger.placeholder`).
     *
     * O artifact deixa o "Selecionar" em `ink`/600 aqui, mas então dois
     * campos vazios lado a lado (Fase e Data) ficam com pesos diferentes.
     * Coerência interna ganha da cópia literal neste ponto. */
    vazio: {
      true: { color: "fg.subtle", fontWeight: "500" },
    },
  },
});
