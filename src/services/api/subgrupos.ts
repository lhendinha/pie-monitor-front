import { chamar, comGrupoAlvo } from "./client";

export function listarSubgrupos(grupoIdAlvo?: string) {
  return chamar("/subgrupos", comGrupoAlvo({}, grupoIdAlvo));
}

export function criarSubgrupo(nome: string, grupoIdAlvo?: string) {
  return chamar("/subgrupos", comGrupoAlvo({ method: "POST", body: { nome } }, grupoIdAlvo));
}

export function removerSubgrupo(subgrupoId: string, grupoIdAlvo?: string) {
  return chamar(`/subgrupos/${subgrupoId}`, comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo));
}
