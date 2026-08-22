import { cores } from "./tokens";

/** Medidas da pílula de filtro, medidas no artifact (`.chip-btn`).
 *
 * Vive num lugar só porque tem DOIS consumidores em formatos diferentes: o
 * `react-select` (que recebe objeto de CSS-in-JS, em `utils/select.ts`) e o
 * botão do Chakra do filtro de datas (que recebe props de estilo). Duplicar
 * faria as duas pílulas divergirem no primeiro ajuste.
 */
export const PILULA = {
  paddingY: "8px",
  paddingX: "13px",
  raio: "999px",
  fonte: "12px",
  peso: 700,
  espacamento: "0.02em",
  gap: "6px",
} as const;

/** Cores da pílula conforme haja ou não filtro escolhido. */
export function coresPilula(ativo: boolean) {
  return {
    borda: ativo ? cores.brandTint2 : cores.line,
    fundo: ativo ? cores.brandTint : cores.surface,
    texto: ativo ? cores.brandDarker : cores.slate,
  };
}
