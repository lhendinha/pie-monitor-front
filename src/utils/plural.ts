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


/** Só a palavra, concordando com a quantidade: "dia", "dias".
 *
 * 🔴 Existe para o caso em que o NÚMERO já está na tela e repeti-lo é ruído.
 * Em "Arquivar concluídas depois de [8] 8 dias" o campo já mostra o 8, e
 * `contar` o escrevia de novo ao lado -- o olho lê duas vezes o mesmo dado.
 *
 * ⚠️ E não é só apagar o número de `contar`: a concordância continua valendo.
 * Com 1 a frase é "[1] dia", não "[1] dias".
 */
export function unidade(quantidade: number, singular: string, plural: string): string {
  return quantidade === 1 ? singular : plural;
}
