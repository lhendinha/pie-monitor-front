import { chakra } from "@chakra-ui/react";

/** O botão que abre o calendário, no lugar de um `<input type="date">`.
 * Medidas do artifact: 9px 12px, raio 6px, 13px/600. */
export const Gatilho = chakra("button", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    width: "100%",
    px: "12px",
    py: "9px",
    borderWidth: "1px",
    borderColor: "border.default",
    borderRadius: "sm",
    bg: "bg.surface",
    fontWeight: "600",
    fontSize: "13px",
    color: "fg.default",
    textAlign: "left",
    cursor: "pointer",
    _hover: { borderColor: "fg.brand" },
    _focusVisible: { outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "2px" },
  },
});
