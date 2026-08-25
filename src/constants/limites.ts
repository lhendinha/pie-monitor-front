/** Tetos de tamanho dos campos, iguais aos que o backend valida.
 *
 * Mesmo espírito de `senha.ts`: existem aqui pra a pessoa não descobrir o
 * limite só depois de enviar. **Quem decide continua sendo o servidor** --
 * isto é conveniência, e a validação de verdade está em
 * `api/src/shared/limites.py`.
 *
 * 🔴 Antes, cada formulário escrevia o número à mão -- e por isso eles
 * discordavam. O nome do cliente é o caso que fecha o argumento: a tela de
 * EDIÇÃO parava em 256, a de CRIAÇÃO não tinha limite nenhum, e o servidor
 * aceita 512. Três respostas para a mesma pergunta, no mesmo campo. Quem
 * cadastrasse uma razão social longa passava pela criação e não conseguia
 * corrigi-la depois; quem tentasse editar batia numa parede invisível na
 * metade do que o sistema permite.
 *
 * ⚠️ Vários valem 512 e continuam SEPARADOS de propósito, igual do lado da
 * API: valor igual não é decisão igual. No dia em que o título da tarefa
 * precisar de mais espaço, o apelido de pessoa não tem por que acompanhar.
 */

/** Nome de GRUPO, de SUBGRUPO e de COLUNA do quadro -- os três usam o mesmo
 * teto no servidor (`NOME_TAMANHO_MAXIMO`).
 *
 * ⚠️ A tela de Configurações do grupo NÃO usa esta constante, e faz certo:
 * ela lê `nome_tamanho_maximo` de `GET /configuracoes`, ou seja, do próprio
 * servidor. Onde dá pra perguntar, perguntar é melhor que espelhar. */
export const TAMANHO_MAXIMO_DE_NOME = 120;

/** Nome de CLIENTE. Maior que o de subgrupo porque razão social de pessoa
 * jurídica é bem mais longa. */
export const TAMANHO_MAXIMO_DO_NOME_DE_CLIENTE = 512;

/** Apelido de uma PESSOA (perfil e edição de membro). */
export const TAMANHO_MAXIMO_DO_APELIDO = 512;

/** Apelido de um PROCESSO -- o nome curto que aparece na lista. */
export const TAMANHO_MAXIMO_DO_APELIDO_DE_PROCESSO = 512;

/** Título de uma tarefa (o "Descrição da tarefa" do modal). */
export const TAMANHO_MAXIMO_DO_TITULO_DE_TAREFA = 512;
