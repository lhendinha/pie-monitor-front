import type { ValorDeParametroDeQuery } from "../types";

/* 🔴 Mora em `utils/`, e não em `services/api/client.ts`: é montagem de
   string, não chamada de API. */
export function montarQuery(query?: Record<string, ValorDeParametroDeQuery>): string {
  if (!query || Object.keys(query).length === 0) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    // `append`, não `set`: `set` sobrescreveria e só o último valor da
    // lista chegaria ao servidor -- filtro múltiplo virando filtro de um.
    if (Array.isArray(v)) v.filter(Boolean).forEach((item) => params.append(k, item));
    else params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
