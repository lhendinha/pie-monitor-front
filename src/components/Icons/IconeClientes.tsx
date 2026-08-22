/** Ícone de "Clientes" no menu lateral. Traçado de 1.8 e `currentColor`:
 * a cor vem do estado do item (ativo/inativo), não do ícone. */
export default function IconeClientes() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <circle cx="17.3" cy="9" r="2.6" />
      <path d="M15.5 13.2A5.4 5.4 0 0121.5 18.4" />
    </svg>
  );
}
