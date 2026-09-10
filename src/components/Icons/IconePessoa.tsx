/** Pessoa com um "+" (`PESSOA` do artefato): o "Atribuir a…" da barra do lote.
 *
 * ⚠️ Nasce com 15x15 e traço 1.8, como a lixeira ao lado dele na barra do
 * lote. Os caminhos saem sem alteração do artefato validado. */
export default function IconePessoa() {
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
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M3 20a6.5 6.5 0 0113 0" />
      <path d="M18.5 7v5M16 9.5h5" />
    </svg>
  );
}
