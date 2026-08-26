/** Ajustes da busca do campo que vincula um registro a processo/atendimento.
 *
 * ⚠️ O arquivo se chamava `vinculoDaTarefa`, e o nome ficou estreito: o mesmo
 * campo passou a servir tarefa, documento e (por estas duas constantes) o
 * campo de processo do atendimento. Nome que fala de UM consumidor convida a
 * segunda cópia quando aparece o segundo.
 */

/** Quantos resultados de cada tipo. Cinco e cinco cabem sem rolagem e
 * deixam claro que a lista é um atalho, não a tela de Processos. */
export const RESULTADOS_POR_TIPO = 5;

/** Menos caracteres que isto e a busca de processo casa com meio banco. */
export const MINIMO_PRA_BUSCAR = 3;

// A espera entre teclas saiu daqui pra `src/constants/busca.ts`: Clientes e
// Processos precisam da mesma, e valores diferentes fariam a mesma ação
// parecer mais lenta numa tela que na outra.
