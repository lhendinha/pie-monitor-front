/** Linhas com uma seta (`MOVER` do artefato): o "Alterar status…" da barra do lote.
 *
 * ⚠️ Nasce com 15x15 e traço 1.8, como a lixeira ao lado dele na barra do
 * lote. Os caminhos saem sem alteração do artefato validado. */
export default function IconeMover() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h7M4 12h5M4 17h7" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12h-6" />
    </svg>
  );
}
