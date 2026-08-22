/** Cruz de "criar" (`ICO.plus` do artifact): vai dentro do botão primário,
 * antes do texto. Sem `width`/`height` próprios de propósito -- quem
 * dimensiona é o botão (`& svg` de 15px), como no artifact. */
export default function IconePlus() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
