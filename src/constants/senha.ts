/** Limites da senha, iguais aos que o backend valida.
 *
 * Aqui pra a pessoa não descobrir o limite só depois de enviar -- o
 * `maxLength` do campo impede passar do teto, e o mínimo desabilita o botão.
 * Quem decide continua sendo o servidor; isto é conveniência.
 */
export const TAMANHO_MINIMO_DA_SENHA = 8;
export const TAMANHO_MAXIMO_DA_SENHA = 64;

/** O texto de apoio do campo, escrito uma vez só: ele aparece na criação de
 * conta e na redefinição, e duas versões da mesma regra divergem. */
export const REGRA_DA_SENHA = `Entre ${TAMANHO_MINIMO_DA_SENHA} e ${TAMANHO_MAXIMO_DA_SENHA} caracteres`;
