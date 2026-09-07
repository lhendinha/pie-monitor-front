/** Centavos inteiros viram o texto que a pessoa lê, e voltam.
 *
 * 🔴 A conta é feita em CENTAVOS, sempre. Dividir por 100 para guardar em
 * `number` traria de volta o problema que a API resolveu: `0,1 + 0,2` não é
 * `0,3` em ponto flutuante, e um extrato que erra um centavo por linha vira
 * uma conversa com o contador.
 *
 * ⚠️ O sinal NÃO entra aqui. Uma saída de R$ 480 é `48000`, positivo; quem
 * decide se aparece como `−480,00` ou em vermelho é a tela, que sabe a
 * natureza do lançamento. Formatar já com o sinal faria a mesma quantia
 * imprimir diferente conforme o caminho até ela.
 *
 * ➡️ `dinheiro.test.ts`.
 */

/** `123456` -> `"1.234,56"`. Sem "R$": o cifrão é do rótulo, não do número,
 * e repeti-lo em toda célula de uma tabela vira ruído. */
export function formatarCentavos(centavos: number): string {
  const inteiro = Math.trunc(Math.abs(centavos) / 100);
  const resto = Math.abs(centavos) % 100;
  const comMilhar = inteiro.toLocaleString("pt-BR");
  return `${centavos < 0 ? "-" : ""}${comMilhar},${String(resto).padStart(2, "0")}`;
}

/** O que a pessoa digitou -> centavos, ou `null` quando não é um valor.
 *
 * 🔴 `null` e não `0`: campo vazio e "zero reais" são coisas diferentes, e
 * devolver `0` para o vazio faria o formulário aceitar um lançamento sem
 * valor achando que a pessoa quis zero.
 *
 * ⚠️ Aceita `1.234,56` e `1234.56`: quem digita rápido usa o ponto do
 * teclado numérico. Vírgula E ponto juntos significam que o ponto é milhar.
 */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const semMilhar = limpo.includes(",") ? limpo.replace(/\./g, "") : limpo;
  const normalizado = semMilhar.replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}
