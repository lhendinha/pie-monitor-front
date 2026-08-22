/** Cadeado (`ICO.lock` do artifact): marca um campo que existe pra ser
 * lido, não editado -- o e-mail de quem se está editando, por exemplo. */
export default function IconeCadeado() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}
