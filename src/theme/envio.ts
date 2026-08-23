import type { ButtonProps } from "@chakra-ui/react";

/** Cores da etiqueta de status de um envio de e-mail.
 *
 * Vive no tema pelo mesmo motivo do `CORES_DO_PAPEL`: é dado de design.
 *
 * "Enviado" usa o azul da marca (`.status-Em andamento` do artifact) e não
 * verde: verde diria "deu tudo certo", e o que o sistema sabe é só que o
 * e-mail saiu -- se foi lido, ninguém aqui sabe.
 *
 * "Falha" foge do artifact de propósito. Lá ela reusa o `.status-Fechado`,
 * que é cinza -- e cinza é a cor de "nenhum" na nossa escala (é o papel
 * `user`). Pior: a linha já marca a falha com um ponto VERMELHO, então
 * etiqueta cinza fazia os dois sinais sobre o mesmo fato se contradizerem.
 * Vermelho é a cor que o sistema já usa pra negativo em todo lugar.
 */
export const CORES_DO_ENVIO: Record<"enviado" | "falhou", Pick<ButtonProps, "bg" | "color">> = {
  enviado: { bg: "bg.brand.subtle", color: "brand.darker" },
  falhou: { bg: "status.bad.bg", color: "status.bad.text" },
};
