import { chamar } from "./client";

export function listarSubgrupos() {
  return chamar("/subgrupos");
}

export function criarSubgrupo(nome: string) {
  return chamar("/subgrupos", { method: "POST", body: { nome } });
}

export function removerSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}`, { method: "DELETE" });
}
