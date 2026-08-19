/** Data de hoje por extenso, em português (ex: "quinta-feira, 13 de agosto de 2026"). */
export function dataHojeExtenso(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/** Formata uma data (dd/mm/aaaa), sem hora -- pra campos como
 * `data_disponibilizacao` da API do PJe, que representam só o dia, não um
 * instante (a API manda algo como "2026-07-17", às vezes com sufixo de hora
 * zerada tipo "T00:00:00Z"). Reorganiza os dígitos direto da string, sem
 * passar por `Date`/`Intl` -- isso evita o bug clássico de fuso horário
 * (`new Date("2026-07-17")` é interpretado como meia-noite UTC, que vira o
 * dia anterior às 21h ao formatar em America/Sao_Paulo). Devolve a string
 * original se não conseguir interpretar. */
export function formatarData(data?: string): string {
  if (!data) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (!match) return data;
  const [, ano, mes, dia] = match;
  return `${dia}/${mes}/${ano}`;
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
