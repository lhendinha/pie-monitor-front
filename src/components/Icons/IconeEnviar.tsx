import type { IconeEnviarProps } from "./types";

/** Avião de papel (`ICO.send` do artifact): envia o que está escrito no
 * campo ao lado -- o registro novo do atendimento.
 *
 * 15px é a medida de `.btn svg`, e vai como padrão porque é onde ele mora. */
export default function IconeEnviar({ tamanho = 15 }: IconeEnviarProps) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 auto" }}
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}
