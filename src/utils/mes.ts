import { hojeISO } from "./prazo";

/** O mês corrente em `aaaa-mm`.
 *
 * ⚠️ Fatia o `hojeISO`, e não `new Date().getMonth()`: aquele é a fonte de
 * "hoje" do sistema inteiro (e a que os testes congelam), e já resolve o
 * fuso -- `toISOString` às 21h em Brasília devolve o dia seguinte, e na
 * virada do mês devolveria o MÊS seguinte.
 */
export function mesDeHoje(): string {
  return hojeISO().slice(0, 7);
}

/** `2026-03` mais `n` meses -- `n` negativo anda para trás.
 *
 * ⚠️ Pelo `Date` com dia 1, e não por aritmética de 12 em 12: somar 10 a
 * `2026-05` tem de dar `2027-03`, e a conta na mão erra a virada de ano
 * exatamente uma vez por ano.
 */
export function somarMeses(mes: string, n: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Quantos meses o período abrange, contando as duas pontas.
 *
 * `2026-01` a `2026-01` é 1; `2026-01` a `2026-12` é 12. É esta contagem
 * que o teto de 24 do servidor usa, e por isso a tela usa a mesma.
 */
export function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
}

/** Os meses do período, do primeiro ao último. Vazio se as pontas estiverem
 * invertidas -- quem valida é quem chama. */
export function mesesDoIntervalo(de: string, ate: string): string[] {
  if (!de || !ate || de > ate) return [];
  const saida: string[] = [];
  for (let atual = de; atual <= ate; atual = somarMeses(atual, 1)) saida.push(atual);
  return saida;
}

/** ⚠️ Minúsculas e sem ponto, como o `Intl` do pt-BR devolve; o Safari
 * devolve com ponto ("mar."), e a tabela do fluxo tem coluna estreita. */
const NOMES = ["jan", "fev", "mar", "abr", "mai", "jun",
               "jul", "ago", "set", "out", "nov", "dez"];

/** `2026-03` vira `mar/2026`. Cabeçalho de coluna da tabela do fluxo.
 *
 * ⚠️ Tabela própria em vez de `Intl.DateTimeFormat`: aquele exige montar um
 * `Date`, e um `Date` a partir de `aaaa-mm-01` é lido como UTC -- em fuso
 * negativo o mês volta um. É o mesmo tropeço que `formatarData` evita
 * fatiando a string.
 */
export function formatarMes(mes?: string): string {
  if (!mes) return "";
  const achado = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!achado) return mes;
  const [, ano, m] = achado;
  return `${NOMES[Number(m) - 1] ?? m}/${ano}`;
}

/** As opções de mês do painel "Definir período…", de `deN` meses atrás a
 * `ateN` meses à frente, da mais recente para a mais antiga.
 *
 * ⚠️ Da mais recente para a mais antiga porque é onde a pessoa vai olhar:
 * o fluxo se pergunta sobre o passado próximo e o futuro próximo, não sobre
 * 2019.
 */
export function opcoesDeMes(deN = 36, ateN = 24): { value: string; label: string }[] {
  const hoje = mesDeHoje();
  const opcoes: { value: string; label: string }[] = [];
  for (let i = ateN; i >= -deN; i -= 1) {
    const mes = somarMeses(hoje, i);
    opcoes.push({ value: mes, label: formatarMes(mes) });
  }
  return opcoes;
}
