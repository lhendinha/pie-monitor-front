import type { PreviaDaImportacao, ResultadoDaImportacao } from "../../types";
import { chamar } from "./client";

/** `POST /subgrupos/{id}/processos/buscar-por-oab` -- procura e NÃO grava.
 *
 * 🔴 É `POST` apesar de não criar processo nenhum: ela guarda o resultado no
 * servidor (para a confirmação não precisar buscar de novo) e recebe quatro
 * campos no corpo. Um `GET` com efeito colateral e parâmetros de consulta
 * seria pior nos dois pontos.
 *
 * ⚠️ Piso `manager` -- a mesma régua da confirmação. Um `user` não chega aqui.
 */
export function buscarProcessosPorOab(
  subgrupoId: string,
  numeroOab: string,
  ufOab: string,
  periodo: { de?: string; ate?: string } = {},
): Promise<PreviaDaImportacao> {
  return chamar(`/subgrupos/${subgrupoId}/processos/buscar-por-oab`, {
    method: "POST",
    body: {
      numero_oab: numeroOab,
      uf_oab: ufOab,
      de: periodo.de ?? "",
      ate: periodo.ate ?? "",
    },
  }) as Promise<PreviaDaImportacao>;
}

/** `POST /subgrupos/{id}/processos/importar` -- grava os escolhidos.
 *
 * ⚠️ Manda o `id` da busca, não os dados: o histórico já está no servidor. É
 * o que evita subir 19,6 MB pelo navegador e evita consultar o PJe de novo.
 *
 * ⚠️ `responsaveis` vazio vira quem está importando, resolvido no SERVIDOR --
 * é o que faz a API poder subir antes do front.
 */
export function importarProcessos(
  subgrupoId: string,
  idDaBusca: string,
  numeros: string[],
  responsaveis: string[] = [],
): Promise<ResultadoDaImportacao> {
  return chamar(`/subgrupos/${subgrupoId}/processos/importar`, {
    method: "POST",
    body: { id: idDaBusca, numeros, responsaveis },
  }) as Promise<ResultadoDaImportacao>;
}
