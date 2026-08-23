/** Tamanho de página padrão pras listas paginadas (Processos, Histórico). */
export const TAMANHO_PAGINA_PADRAO = 10;

/** O maior `tamanho_pagina` que a API aceita (`le=100` no FastAPI). Pedir
 * mais devolve 422.
 *
 * DOIS jeitos de usar, e a diferença é de quem chama, não do número:
 *
 * - **uma página só, sem paginar** -- os pickers (dropdown de Cliente, Fase,
 *   Situação, MultiSelect de subgrupos) e a lista de Fases/Situações, que é
 *   ordenada por arraste e não pode vir pela metade. É uma aposta de que
 *   nenhum grupo real passa disso, e ela vale a pena porque a alternativa é
 *   paginar um dropdown;
 * - **página a página até somar o `total`** -- o quadro do Kanban, onde
 *   faltar item significa cartão que some sem erro nenhum.
 *
 * Um valor só também mantém o cache do React Query compartilhado entre quem
 * só lista e quem também escreve. */
export const TETO_POR_PAGINA = 100;

