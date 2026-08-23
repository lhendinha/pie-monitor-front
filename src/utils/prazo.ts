/** Hoje em `aaaa-mm-dd`, no fuso de quem está olhando.
 *
 * ⚠️ Nada de `new Date().toISOString()`: aquele converte pra UTC, e às 21h
 * em Brasília ele já devolve o dia seguinte -- a tarefa de amanhã apareceria
 * como "Hoje" toda noite.
 */
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Quantos dias separam uma data de hoje. Negativo = passado. */
export function diasAte(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  const alvo = new Date(a, m - 1, d);
  const [ha, hm, hd] = hojeISO().split("-").map(Number);
  const hoje = new Date(ha, hm - 1, hd);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** A data daqui a `n` dias, em `aaaa-mm-dd`.
 *
 * Monta pelo construtor local (`new Date(a, m - 1, d + n)`), que já
 * normaliza virada de mês e ano -- e sem passar por UTC, pelo mesmo motivo
 * do `hojeISO`.
 */
export function emDias(n: number): string {
  const [a, m, d] = hojeISO().split("-").map(Number);
  const alvo = new Date(a, m - 1, d + n);
  const mes = String(alvo.getMonth() + 1).padStart(2, "0");
  const dia = String(alvo.getDate()).padStart(2, "0");
  return `${alvo.getFullYear()}-${mes}-${dia}`;
}
