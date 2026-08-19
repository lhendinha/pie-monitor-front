/** Ícones custom em SVG -- usados nos botões de ação junto com os glifos de
 * texto (✎/✕), pra quando não há um caractere Unicode que capture bem o
 * significado. Herdam a cor via `currentColor`, então acompanham o hover
 * normal do `.icon-btn` igual aos glifos de texto. */

export function IconeHistorico() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.5 21a8 8 0 1 0 -7.446 -11" />
      <path d="M3 4v4h4" />
      <path d="M12.5 8v5l3 2" />
    </svg>
  );
}
