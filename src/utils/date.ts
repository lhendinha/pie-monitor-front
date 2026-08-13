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
