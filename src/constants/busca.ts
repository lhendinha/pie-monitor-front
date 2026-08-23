/** Espera entre teclas antes de consultar o servidor, em ms.
 *
 * Compartilhada porque três campos de busca do sistema precisam da mesma:
 * Clientes, Processos e o vínculo da tarefa. Valores diferentes fariam a
 * mesma ação parecer mais lenta numa tela que na outra sem razão nenhuma.
 */
export const ESPERA_DA_BUSCA_MS = 300;
