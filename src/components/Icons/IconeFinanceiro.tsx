/** Ícone de "Financeiro" no menu lateral. Traçado de 1.8 e `currentColor`:
 * a cor vem do estado do item (ativo/inativo), não do ícone.
 *
 * Uma carteira, e não cifrão nem gráfico: cifrão vira ruído ao lado de
 * qualquer número na tela, e gráfico é o Histórico. A carteira diz "o
 * dinheiro do escritório", que é o que a seção é. */
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
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
      <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19H19a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5Z" />
      <path d="M16.5 13.5h.01" />
    </svg>
  );
}
