/** Ícone de "Documentos" no menu lateral. Traçado de 1.8 e `currentColor`:
 * a cor vem do estado do item (ativo/inativo), não do ícone.
 *
 * ⚠️ Folha com o canto dobrado, e não uma pasta: `IconeProcessos` já é a
 * pasta, e dois ícones de pasta lado a lado no menu não se distinguem de
 * relance -- que é justamente o que o ícone existe pra fazer.
 */
export default function IconeDocumentos() {
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
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
