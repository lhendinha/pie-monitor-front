/** Triângulo de atenção. Não vem do artifact -- lá o aviso só existe no
 * caso de sucesso, com o tique verde. Um erro com o MESMO tique, só que
 * vermelho, se lê como sucesso pra quem olha de canto de olho; a forma
 * precisa mudar junto com a cor. */
export default function IconeAlerta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 3.9L1.8 18.2A2 2 0 003.5 21h17a2 2 0 001.7-2.8L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
