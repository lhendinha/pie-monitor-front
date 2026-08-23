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

/** Cria uma coluna no fim do quadro. Piso `admin` no servidor. */
export function criarColuna(subgrupoId: string, nome: string) {
  return chamar(`/subgrupos/${subgrupoId}/quadro`, { method: "POST", body: { nome } });
}

/** PATCH parcial da coluna: o campo omitido não é tocado. */
export interface CamposDaColuna {
  nome?: string;
  ordem?: number;
}

/** Renomeia e/ou reordena. Os dois campos são opcionais e independentes --
 * mandar só `ordem` num arraste evita sobrescrever um rename concorrente
 * com um nome já defasado. */
export function atualizarColuna(
  subgrupoId: string,
  colunaId: string,
  campos: CamposDaColuna,
) {
  return chamar(`/subgrupos/${subgrupoId}/quadro/${colunaId}`, {
    method: "PATCH",
    body: { ...campos },
  });
}

/** Marca qual coluna significa "concluída".
 *
 * É uma marca, e não "a última do quadro": com posição definindo estado,
 * acrescentar uma coluna no fim reabriria toda tarefa já concluída.
 */
export function marcarColunaConclusao(subgrupoId: string, colunaId: string) {
  return chamar(`/subgrupos/${subgrupoId}/quadro/${colunaId}/conclusao`, { method: "POST" });
}

/** Remove a coluna. As tarefas dela vão pra coluna ANTERIOR -- nunca ficam
 * sem coluna, o que as tiraria do quadro sem apagá-las. O servidor recusa
 * remover a de conclusão e a última que sobrar. */
export function removerColuna(subgrupoId: string, colunaId: string) {
  return chamar(`/subgrupos/${subgrupoId}/quadro/${colunaId}`, { method: "DELETE" });
}
