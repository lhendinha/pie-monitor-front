import { chamar } from "./client";

export function listarHistorico(numeroProcesso?: string) {
  const query = numeroProcesso ? `?numero_processo=${encodeURIComponent(numeroProcesso)}` : "";
  return chamar(`/historico${query}`);
}
