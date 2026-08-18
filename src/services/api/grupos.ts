import { chamar } from "./client";

export function listarGrupos() {
  return chamar("/grupos");
}

export function listarSubgruposDoGrupo(grupoId: string) {
  return chamar(`/grupos/${grupoId}/subgrupos`);
}
