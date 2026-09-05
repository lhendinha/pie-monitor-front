/** Espera entre teclas antes de consultar o servidor, em ms.
 *
 * Compartilhada porque três campos de busca do sistema precisam da mesma:
 * Clientes, Processos e o vínculo da tarefa. Valores diferentes fariam a
 * mesma ação parecer mais lenta numa tela que na outra sem razão nenhuma.
 */
export const ESPERA_DA_BUSCA_MS = 300;

/** Quantos itens a PRIMEIRA PÁGINA de uma pílula de filtro traz.
 *
 * 🔴 A regra que passou a valer no sistema: *toda lista que pode crescer sem
 * limite carrega a primeira página e se completa por busca.* Antes, cliente,
 * subgrupo e pessoa vinham inteiros -- e com 5.000 clientes a tela de
 * Processos levava 3,8 segundos até mostrar nome em vez de id, medido em
 * Chrome. O catálogo era baixado mesmo por quem nunca abria o filtro.
 *
 * ⚠️ Igual ao teto do servidor (`MAXIMO_DE_RESULTADOS_DE_BUSCA` em
 * `api/src/shared/limites.py`). Pedir mais que ele daria uma lista cortada
 * sem que ninguém avisasse, e pedir menos deixaria de fora resultado que o
 * servidor já tinha achado e mandado.
 */
export const PRIMEIRA_PAGINA_DE_OPCOES = 50;

/** O pedido de primeira página que as pílulas buscáveis fazem, pronto pra
 * espalhar nos parâmetros da chamada. */
export const PAGINA_DE_OPCOES = { tamanhoPagina: PRIMEIRA_PAGINA_DE_OPCOES };
