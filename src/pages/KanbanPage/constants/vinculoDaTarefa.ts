/** Ajustes da busca do campo "Processo ou atendimento vinculado". */

/** Quantos resultados de cada tipo. Cinco e cinco cabem sem rolagem e
 * deixam claro que a lista é um atalho, não a tela de Processos. */
export const RESULTADOS_POR_TIPO = 5;

/** Menos caracteres que isto e a busca de processo casa com meio banco. */
export const MINIMO_PRA_BUSCAR = 3;

/** Espera entre teclas, em ms. Sem ela é uma requisição por caractere -- e
 * número de processo tem 20 dígitos. */
export const ESPERA_DA_BUSCA_MS = 300;
