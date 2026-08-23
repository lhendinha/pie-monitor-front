/** Tique de "deu certo" (`ICO.check` do artifact): traço 3, mais grosso que
 * os outros ícones -- ele aparece pequeno e sozinho dentro do aviso.
 *
 * ⚠️ Nasce com 15x15, como a lixeira. Sem dimensão própria, um `<svg>` cai
 * no padrão do navegador (300x150) ou estica no contêiner -- e este ícone
 * dependia de TODO chamador lembrar de dimensioná-lo por CSS. Funcionou
 * enquanto foram quatro; o quinto (a linha de coluna do quadro) esqueceu e
 * o tique saiu deformado. Quem precisa de outro tamanho continua
 * sobrescrevendo por `css`, como já fazem os quatro. */
export default function IconeCheck() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
