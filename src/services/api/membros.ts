import { chamar } from "./client";

export function listarMembrosDoGrupo() {
  return chamar("/grupos/membros");
}

export function listarMembrosDoSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`);
}

export function adicionarMembro(subgrupoId: string, email: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`, { method: "POST", body: { email } });
}

export function removerMembro(subgrupoId: string, email: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros/${encodeURIComponent(email)}`, { method: "DELETE" });
}

export function atualizarMembro(
  email: string,
  dados: { apelido: string; grupo_id: string; papel: string; subgrupos: string[] }
) {
  return chamar(`/grupos/membros/${encodeURIComponent(email)}`, { method: "PATCH", body: dados });
}
