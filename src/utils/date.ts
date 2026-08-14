/** Data de hoje por extenso, em português (ex: "quinta-feira, 13 de agosto de 2026"). */
export function dataHojeExtenso(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/** Formata um ISO 8601 no padrão brasileiro (dd/mm/aaaa hh:mm). Devolve a
 * string original se não conseguir interpretar (mais seguro que quebrar a UI). */
export function formatarDataHora(iso?: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Formata um ISO 8601 como dd/mm/aaaa hh:mmAM|PM (ex: 14/08/2026 12:13PM),
 * já convertido pro fuso horário local do navegador. `hourCycle: "h12"`
 * (em vez de `hour12: true`) evita um bug do ICU em pt-BR que mostra "00"
 * ao meio-dia. Devolve a string original se não conseguir interpretar. */
export function formatarDataHoraAmPm(iso?: string): string {
  if (!iso) return "";
  try {
    const partes = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h12",
    }).formatToParts(new Date(iso));

    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
    return `${valor("day")}/${valor("month")}/${valor("year")} ${valor("hour")}:${valor("minute")}${valor("dayPeriod")}`;
  } catch {
    return iso;
  }
}
