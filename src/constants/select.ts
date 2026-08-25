/** Acima do `.modal-overlay` (100) e do `.toast-stack` (200) -- o menu é
 * portalado em `document.body`, então precisa vencer os dois em qualquer
 * ordem de montagem. `menuPosition="fixed"` (nos componentes `Select`/
 * `MultiSelect`) é o pareamento recomendado do react-select com
 * `menuPortalTarget`: sem isso (`"absolute"`, o default), o menu se
 * posiciona somando o scroll da PÁGINA -- mas `.modal-card` rola por
 * dentro de si mesma (`overflow-y: auto`), não a página,
 * então o cálculo ficava errado e o menu abria pra baixo (ignorando
 * `menuPlacement="auto"`) mesmo sem espaço, vazando pra fora do modal. */
export const Z_INDEX_MENU_PORTAL = 210;
/** Até onde a lista de opções cresce antes de rolar.
 *
 * 🔴 Este número existia DUAS vezes, com nomes diferentes: aqui, e como
 * `ALTURA_LISTA` em `theme/painelFiltro.ts`. Os dois limitam a MESMA lista
 * do MESMO componente, por caminhos diferentes -- este vai no
 * `maxMenuHeight` do react-select (variante `padrao`), o outro ia no
 * `maxHeight` do `menuList` nos estilos da variante `chip`. Mudar um só
 * faria as duas variantes do mesmo `Select` discordarem de altura. */
export const ALTURA_MAXIMA_MENU = 240;

export const SEM_INDICADORES = { DropdownIndicator: () => null, IndicatorSeparator: () => null };
