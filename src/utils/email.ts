/** Mesmo formato que o backend aceita (`EMAIL_RE` em `shared/validacao.py`):
 * algo, arroba, algo, ponto, algo -- sem espaços.
 *
 * Existe pra avisar ANTES do envio. A garantia continua sendo do servidor:
 * esta função é conveniência, e a regra tem que ser a mesma dos dois lados
 * pra a tela não aceitar o que a API vai recusar.
 */
const FORMATO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function emailValido(email: string): boolean {
  return FORMATO.test(email.trim());
}
