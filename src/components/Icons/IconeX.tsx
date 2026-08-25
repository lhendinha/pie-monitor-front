/** X de "limpar"/"fechar".
 *
 * 🔴 O gesto era desenhado com o CARACTERE `✕`, e caractere não é ícone: a
 * espessura do traço vem do peso da fonte, não do `strokeWidth`, então ele
 * engrossava ou afinava conforme o texto ao redor -- dentro da pílula, que é
 * `font-weight: 700` e caixa alta, o X saía visivelmente mais gordo que o
 * resto do conjunto. E o desenho muda de forma entre plataformas, porque
 * quem escolhe é a fonte do sistema.
 *
 * Sem `width`/`height` próprios, como os outros: quem dimensiona é o botão.
 */
export default function IconeX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
