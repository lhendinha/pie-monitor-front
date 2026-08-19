/** Tamanho de página padrão pras listas paginadas (Processos, Histórico). */
export const TAMANHO_PAGINA_PADRAO = 10;

/** Teto usado por quem precisa da lista "inteira" pra popular um picker
 * (dropdown de Cliente/Fase/Situação, MultiSelect de subgrupos) em vez de
 * paginar de verdade -- não é o caso de nenhum grupo real hoje ter mais
 * que isso. Usar o mesmo valor em todo lugar garante que o React Query
 * compartilhe cache entre quem só lista (ex.: filtro de Processos) e quem
 * também escreve (ex.: CamposProcesso). */
export const TAMANHO_PAGINA_PICKER = 100;
