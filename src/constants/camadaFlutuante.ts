/** Marca uma camada flutuante (menu, painel, calendário) renderizada por
 * portal, fora da árvore de quem a abriu.
 *
 * Serve pra responder "esse clique foi dentro ou fora?" quando
 * `ref.contains` não alcança: o elemento vive em `document.body`, e o único
 * jeito de reconhecê-lo é por um atributo que ele mesmo carrega.
 *
 * Usado pelos painéis de filtro do `react-select` (situação, fase,
 * cliente), que não têm dispensa própria.
 */
export const MARCA_CAMADA_FLUTUANTE = { "data-camada-flutuante": "" };
export const SELETOR_CAMADA_FLUTUANTE = "[data-camada-flutuante]";

/** O calendário do `SeletorData`, que também é portalado.
 *
 * O filtro de datas o declara como `persistentElements` do seu `Popover`:
 * sem isso, clicar num dia conta como clique fora e fecha o painel inteiro
 * antes de dar pra clicar em Aplicar. */
export const SELETOR_CALENDARIO = '[data-scope="date-picker"][data-part="content"]';

/** O calendário abre POR CIMA do painel de filtro (`z-index` 1500 do
 * `Popover` do Chakra), e os dois são portais irmãos em `document.body`.
 *
 * ⚠️ Sem declarar isto, quem fica na frente é decidido pela ORDEM DO DOM: a
 * lib põe `z-index` no conteúdo do calendário, mas num elemento
 * `position: static`, onde `z-index` não faz efeito nenhum. Vai junto de um
 * `position: relative` -- e nunca no posicionador, que é onde o motor de
 * posicionamento escreve o `style` e um `style` nosso apagaria o
 * `transform` (o calendário ia parar em 0,0). */
export const Z_INDEX_CALENDARIO = 1600;
