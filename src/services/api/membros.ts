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

/** O que a edição de membro manda -- todos os campos juntos, porque a
 * rota substitui o conjunto, não faz merge.
 *
 * ⚠️ `type`, e não `interface`: isto vai direto como `body`, que é
 * `Record<string, unknown>`. Interface não é atribuível a um Record (o TS
 * não lhe dá index signature implícita); um type alias é. */
export type DadosDoMembro = {
  apelido: string;
  grupo_id: string;
  papel: string;
  subgrupos: string[];
};

export function atualizarMembro(
  email: string,
  dados: DadosDoMembro
) {
  return chamar(`/grupos/membros/${encodeURIComponent(email)}`, { method: "PATCH", body: dados });
}
