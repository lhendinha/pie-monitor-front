/** Medidas do painel que abre embaixo de uma pílula de filtro.
 *
 * Tudo aqui foi lido do CSS do artifact (`.period-panel.wide`,
 * `.period-opt`, `.period-div`, `.filter-radio`, `.filter-actions`, `.btn`,
 * `.dp-trigger`, `.filter-col-label`), não estimado da imagem.
 *
 * Vive fora dos componentes porque tem consumidores em DOIS formatos: o
 * `react-select`, que recebe objeto de CSS-in-JS (`utils/select.ts`), e os
 * componentes do Chakra, que recebem props de estilo. Mesma razão de
 * `pilula.ts` -- duplicar faz os painéis divergirem no primeiro ajuste.
 */

/** `.period-panel.wide` */
export const PAINEL = {
  largura: 340,
  padding: "2px",
  margemTopo: 6,
} as const;

/** `.period-opt` -- linha de opção que ocupa a largura toda ("Todas as
 * situações", e cada cliente no filtro de valor único). */
export const OPCAO_LINHA = {
  padding: "8px 12px",
  raio: "sm",
  fonte: "13px",
  peso: 600,
  pesoAtiva: 800,
} as const;

/** `.filter-radio` -- linha com caixa de seleção (situação e fase).
 *
 * O padding lateral é 8px, e não os 2px do artifact: a lista do
 * react-select já vem com 2px de folga do painel, e com 2px aqui as caixas
 * encostavam na borda. Esta é a versão que foi conferida na tela e
 * aprovada. */
export const OPCAO_CAIXA = {
  padding: "5px 8px",
  gap: "8px",
  fonte: "13px",
  peso: 600,
} as const;

/** `.period-div` */
export const DIVISORIA = { margem: "6px 4px" } as const;

/** `.filter-actions` */
export const RODAPE = {
  padding: "10px 12px",
  gap: "8px",
  margemTopo: "6px",
} as const;

/** `.btn` */
export const BOTAO = {
  padding: "9px 16px",
  raio: "sm",
  fonte: "13px",
  peso: 700,
  gap: "7px",
} as const;

/** `.dp-trigger` -- o campo de data dentro do painel. */
export const CAMPO_DATA = {
  altura: "38px",
  padding: "9px 12px",
  raio: "sm",
  fonte: "13px",
  peso: 600,
  gap: "9px",
  icone: "15px",
} as const;

/** Coluna interna do painel de datas: o painel tem 340px, mas o conteúdo
 * ocupa 250px e sobra folga à direita -- é assim no artifact. */
export const COLUNA_DATAS = {
  largura: "250px",
  padding: "10px 12px",
  espacoEntreCampos: "12px",
} as const;

/** Rolagem da lista de opções, para o painel não crescer sem fim. */
export const ALTURA_LISTA = 240;

/** "Nenhuma opção disponível." -- respira mais que uma opção comum, senão o
 * painel vazio fica com a frase espremida contra a divisória. */
export const MENSAGEM_VAZIA = {
  padding: "16px 12px",
  fonte: "13px",
} as const;
