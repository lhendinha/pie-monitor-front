/** Ícone de "Financeiro" no menu lateral. Traçado de 1.8 e `currentColor`:
 * a cor vem do estado do item (ativo/inativo), não do ícone.
 *
 * ⚠️ O traçado é o do artefato validado, verbatim. */
export default function IconeFinanceiro() {
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
      <path d="M12 2v20" />
      <path d="M16.5 6.5a4 4 0 0 0-3.5-2h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1-3.5-2" />
    </svg>
  );
}
