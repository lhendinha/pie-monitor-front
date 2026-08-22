/** Seta pra esquerda (`ICO.back` do artifact): 15px, traço 2.
 *
 * A seta pra direita é esta mesma espelhada (`transform: scaleX(-1)`), como
 * no artifact -- é um desenho só, não dois. */
export default function IconeSeta() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 auto" }}
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
