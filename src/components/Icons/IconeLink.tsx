interface IconeLinkProps {
  tamanho?: number;
}

/** Elo de corrente (`ICO.link` do artifact): marca o que está VINCULADO a
 * outra coisa -- o processo no cabeçalho do atendimento.
 *
 * `tamanho` porque o artifact desenha o mesmo ícone em medidas diferentes
 * conforme o lugar (13px dentro do `.meta-chip`). */
export default function IconeLink({ tamanho = 15 }: IconeLinkProps) {
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
      style={{ flex: "0 0 auto" }}
    >
      <path d="M9 17H7a5 5 0 010-10h2M15 7h2a5 5 0 010 10h-2M8 12h8" />
    </svg>
  );
}
