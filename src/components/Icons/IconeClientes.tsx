import type { IconeClientesProps } from "./types";

/** Ícone de "Clientes". Traçado de 1.8 e `currentColor`: a cor vem do
 * estado de quem o usa (ativo/inativo), não do ícone.
 *
 * `tamanho` porque ele tem dois usos com medidas diferentes: 18px no menu
 * lateral e 13px na linha do atendimento (`.at-item-cliente svg` do
 * artifact). Sem a prop, o segundo caso teria que apertá-lo por CSS de
 * fora -- que foi exatamente como o `IconeCheck` acabou deformado. */
export default function IconeClientes({ tamanho = 18 }: IconeClientesProps) {
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
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <circle cx="17.3" cy="9" r="2.6" />
      <path d="M15.5 13.2A5.4 5.4 0 0121.5 18.4" />
    </svg>
  );
}
