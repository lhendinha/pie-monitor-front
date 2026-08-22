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
    /** `.btn-sq.danger` do artifact: em repouso é igual ao neutro -- é só
     * no hover que ele fica vermelho. Ação destrutiva que já nasce vermelha
     * chama atenção o tempo todo numa lista onde o normal é não excluir. */
    tom: {
      neutro: {},
      perigo: {
        _hover: {
          bg: "status.bad.bg",
          color: "status.bad",
          borderColor: "status.bad",
        },
      },
    },
    tamanho: {
      padrao: { width: "34px", height: "34px" },
      compacto: { width: "26px", height: "26px" },
    },
  },
  defaultVariants: { tamanho: "padrao", tom: "neutro" },
});
