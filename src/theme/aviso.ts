import type { SystemStyleObject } from "@chakra-ui/react";

import { DURACAO_DO_AVISO_COM_DESFAZER_MS } from "../constants/toast";

/** O azul claro das ações sobre a pílula escura do aviso (`.desfazer` e
 * `.prazo` do artefato validado).
 *
 * ⚠️ Literal, e não token: é a única cor clara que o sistema usa SOBRE o fundo
 * `fg`, e um token genérico com esse valor convidaria a usá-lo sobre fundo
 * claro, onde ele some. */
const AZUL_SOBRE_ESCURO = "#7ec8ee";

/** O botão DESFAZER (`.desfazer`). */
export const ACAO_DO_AVISO: SystemStyleObject = {
  border: "0",
  bg: "transparent",
  color: AZUL_SOBRE_ESCURO,
  fontSize: "12.5px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  cursor: "pointer",
  padding: "4px 6px",
  borderRadius: "4px",
  whiteSpace: "nowrap",
  flex: "0 0 auto",
  _hover: { bg: "rgba(255,255,255,.12)", color: "white" },
};

/** O X que dispensa (`.fechar-toast`). */
export const FECHAR_DO_AVISO: SystemStyleObject = {
  border: "0",
  bg: "transparent",
  color: "rgba(255,255,255,.55)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  padding: "4px",
  borderRadius: "4px",
  flex: "0 0 auto",
  _hover: { bg: "rgba(255,255,255,.12)", color: "white" },
  "& svg": { width: "13px", height: "13px" },
};

/** A barrinha que drena no pé (`.prazo`).
 *
 * 🔴 É ela que torna a janela HONESTA: desfazer tem prazo, e esconder o prazo
 * faria a pessoa descobrir que acabou tarde. Anda no mesmo compasso do aviso,
 * porque lê a mesma constante. */
export const PRAZO_DO_AVISO: SystemStyleObject = {
  position: "absolute",
  left: "0",
  bottom: "0",
  height: "2px",
  width: "100%",
  bg: AZUL_SOBRE_ESCURO,
  transformOrigin: "left",
  animation: `drenar ${DURACAO_DO_AVISO_COM_DESFAZER_MS}ms linear forwards`,
  "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.4 },
};
