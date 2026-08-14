import { chamar, comGrupoAlvo } from "./client";

export function listarMembrosDoGrupo(grupoIdAlvo?: string) {
  return chamar("/grupos/membros", comGrupoAlvo({}, grupoIdAlvo));
}

export function listarMembrosDoSubgrupo(subgrupoId: string, grupoIdAlvo?: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`, comGrupoAlvo({}, grupoIdAlvo));
}

export function adicionarMembro(subgrupoId: string, email: string, grupoIdAlvo?: string) {
  return chamar(
    `/subgrupos/${subgrupoId}/membros`,
    comGrupoAlvo({ method: "POST", body: { email } }, grupoIdAlvo)
  );
}

export function removerMembro(subgrupoId: string, email: string, grupoIdAlvo?: string) {
  return chamar(
    `/subgrupos/${subgrupoId}/membros/${encodeURIComponent(email)}`,
    comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo)
  );
}
