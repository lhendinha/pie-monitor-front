/** Olho cortado (`ICO.olhoCortado` do artifact): desativar.
 *
 * E não uma lixeira: desativar é reversível -- a opção some das listas
 * novas, mas continua nos processos que já a usam, e há "Reativar" na mesma
 * tela. Lixeira aqui prometeria uma destruição que não acontece. */
export default function IconeOlhoCortado() {
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
      <path d="M9.9 5.2A9.6 9.6 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-2.8 3.7M6.3 6.4A17 17 0 002 12s3.6 7 10 7a9.5 9.5 0 004.2-.9" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
