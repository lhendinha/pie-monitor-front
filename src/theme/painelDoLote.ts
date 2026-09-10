import type { SystemStyleObject } from "@chakra-ui/react";

/** O painel que abre de um botão da barra do lote (`.painel` do artefato).
 *
 * ⚠️ Não reusa `PAINEL_DE_MENU`, e a diferença é medida no artefato validado:
 * 320px com padding 2px, contra `minWidth` 216 e padding 6 do menu de período.
 * Cada linha aqui carrega DUAS falas -- o nome e a dica --, e 216px cortaria a
 * dica justamente onde ela avisa que alguém vai ficar de fora.
 */
export const PAINEL_DO_LOTE: SystemStyleObject = {
  width: "320px",
  padding: "2px",
  bg: "bg.surface",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "md",
  boxShadow: "md",
  /* Mesmo motivo de `PAINEL_DE_MENU`: o foco visível do tema desenharia uma
     moldura azul grossa, e quem navega por teclado já vê o item realçado. */
  _focusVisible: { outline: "none" },
};

/** O rótulo do topo (`.painel .rot`). */
export const ROTULO_DO_PAINEL: SystemStyleObject = {
  padding: "10px 12px 6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: ".02em",
  textTransform: "uppercase",
  color: "fg.subtle",
};

/** Uma opção (`.opcao`). Realça no hover E no item focado pelo teclado. */
export const OPCAO_DO_LOTE: SystemStyleObject = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  width: "100%",
  padding: "8px 12px",
  borderRadius: "sm",
  textAlign: "left",
  cursor: "pointer",
  _hover: { bg: "border.subtle" },
  _highlighted: { bg: "border.subtle" },
};

/** O nome dentro da opção (`.opcao .nome`). */
export const NOME_DA_OPCAO: SystemStyleObject = {
  fontSize: "13px",
  fontWeight: "600",
  color: "fg",
};

/** A dica sob o nome (`.opcao .aviso`). A cor vem de quem usa: verde quando
 * está tudo certo, âmbar quando alguma tarefa fica de fora. */
export const DICA_DA_OPCAO: SystemStyleObject = {
  fontSize: "11.5px",
  fontWeight: "600",
  marginTop: "1px",
};

/** A linha antes do "devolver ao pool" (`.divisoria`). */
export const DIVISORIA_DO_PAINEL: SystemStyleObject = {
  height: "1px",
  bg: "border.subtle",
  margin: "6px 4px",
};

/** O círculo tracejado do "Ninguém" (`.assumir`): o mesmo desenho do "sem
 * responsável" que a Área de trabalho usa para assumir. */
export const NINGUEM_NO_PAINEL: SystemStyleObject = {
  width: "22px",
  height: "22px",
  borderRadius: "full",
  borderWidth: "1.5px",
  borderStyle: "dashed",
  borderColor: "fg.subtle",
  flex: "0 0 auto",
};
