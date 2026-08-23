import type { ButtonProps } from "@chakra-ui/react";

/** Cores da etiqueta de status de um envio de e-mail.
 *
 * Vive no tema pelo mesmo motivo do `CORES_DO_PAPEL`: é dado de design.
 *
 * "Enviado" usa o azul da marca (`.status-Em andamento` do artifact) e não
 * verde: verde diria "deu tudo certo", e o que o sistema sabe é só que o
 * e-mail saiu -- se foi lido, ninguém aqui sabe. Falha usa o cinza neutro
 * (`.status-Fechado`), com o ponto vermelho da linha fazendo o alarme.
 */
export const CORES_DO_ENVIO: Record<"enviado" | "falhou", Pick<ButtonProps, "bg" | "color">> = {
  enviado: { bg: "bg.brand.subtle", color: "brand.darker" },
  falhou: { bg: "border.subtle", color: "fg.muted" },
};
