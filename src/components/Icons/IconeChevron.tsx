interface Props {
  tamanho?: number;
}

/** Seta do select (`.csel-trigger svg` do artifact): 15px, traço 2.
 * Quem abre o menu gira 180°. */
export default function IconeChevron({ tamanho = 15 }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 auto" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
