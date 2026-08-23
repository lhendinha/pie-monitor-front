import { chamar } from "./client";
import type { DadosDoMembro } from "../../types/requisicoes";

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
  dados: DadosDoMembro
) {
  return chamar(`/grupos/membros/${encodeURIComponent(email)}`, { method: "PATCH", body: dados });
}
