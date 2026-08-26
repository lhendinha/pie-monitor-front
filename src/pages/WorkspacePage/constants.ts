/** Passos do "Por página" dos cards de tarefa.
 *
 * Menores que os das listagens (10/20/30/50/100) porque aqui os dois cards
 * dividem a coluna com "Minhas atividades" e o "Resumo rápido": uma lista de
 * 30 empurraria os outros pra fora da primeira tela. */
export const TAMANHOS_PAGINA_CARD = [5, 10, 20] as const;

export const TAMANHO_PAGINA_CARD_PADRAO = 5;

/** Quanto tempo o card "Disponíveis para assumir" fica destacado depois de
 * clicar em "Tarefas sem responsável".
 *
 * Curto de propósito: é confirmação de que o clique ligou o número à lista,
 * não um estado a ser lido. Destaque que fica esquece por que apareceu.
 */
export const DESTAQUE_MS = 1600;
