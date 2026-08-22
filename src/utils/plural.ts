/** Contagem com a palavra no plural correto: "1 processo", "3 processos".
 *
 * Existe pra acabar com o `${n} processo(s)`, que o sistema usava em três
 * telas. Parêntese de plural é gíria de programador vazando pra interface:
 * ninguém escreve assim num texto de verdade, e em português fica pior que
 * em inglês porque o plural nem sempre é só somar "s".
 *
 * Por isso o plural é PARÂMETRO, não `palavra + "s"` -- assim serve pra
 * "opção/opções" e "cliente/clientes" com a mesma função.
 */
export function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}
