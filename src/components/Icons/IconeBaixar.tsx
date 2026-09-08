/** Seta para baixo sobre uma bandeja (`ICO.download` do artifact): vai antes
 * do texto no botão de exportar. Sem `width`/`height` próprios, como o
 * `IconePlus` -- quem dimensiona é o botão (`& svg` de 15px). */
export default function IconeBaixar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  );
}
