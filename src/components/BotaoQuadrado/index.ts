import { chakra } from "@chakra-ui/react";

/** Botão quadrado só com ícone (`.btn-sq` do artifact).
 *
 * `tamanho="compacto"` é a versão de 26px que o artifact usa dentro do
 * calendário; o padrão de 34px é o das barras de ação.
 *
 * ⚠️ `borderStyle: solid` explícito: o reset por tag zera a largura da
 * borda, e largura sem estilo computa 0 -- a borda simplesmente não
 * aparece. Mesmo motivo do `Gatilho`.
 */
export const BotaoQuadrado = chakra("button", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderRadius: "sm",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    bg: "bg.surface",
    color: "fg.muted",
    cursor: "pointer",
    _hover: { bg: "border.subtle", color: "fg" },
  },
  variants: {
    tamanho: {
      padrao: { width: "34px", height: "34px" },
      compacto: { width: "26px", height: "26px" },
    },
  },
  defaultVariants: { tamanho: "padrao" },
});
