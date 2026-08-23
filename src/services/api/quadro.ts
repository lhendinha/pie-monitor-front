import { chamar } from "./client";

/** GET /subgrupos/{id}/quadro -- as colunas do Kanban daquele subgrupo.
 *
 * Cada subgrupo tem o PRÓPRIO quadro, e é aqui que se descobre qual coluna
 * marca conclusão (`e_conclusao`). "Concluída" nunca é "a última do quadro":
 * com posição definindo estado, acrescentar uma coluna no fim reabriria toda
 * tarefa concluída. */
export function listarQuadro(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/quadro`);
}
