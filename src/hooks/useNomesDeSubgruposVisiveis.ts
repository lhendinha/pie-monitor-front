import { useCallback } from "react";

import { useTodosOsSubgrupos } from "./useTodosOsSubgrupos";
import { useToastOnQueryError } from "../services/queryClient";

/** Os nomes de uma LISTA de subgrupos, DESCARTANDO os que não são seus.
 *
 * 🔴 **Comportamento OPOSTO ao de `useNomeDeSubgrupo`, e de propósito.** Lá,
 * id que não resolve vira o próprio id; aqui, some. A diferença não é
 * inconsistência -- é que "não resolveu" significa coisas diferentes nos dois
 * casos:
 *
 * - **um item, um subgrupo** (processo, documento, tarefa): não resolver quer
 *   dizer que o subgrupo foi APAGADO. O item é seu, e mostrar o id é o resto
 *   honesto -- a etiqueta sumir faria a coluna afirmar "sem subgrupo";
 * - **um item, VÁRIOS subgrupos** (o histórico): um envio entra na sua lista
 *   por INTERSEÇÃO -- basta um dos `subgrupos_notificados` cruzar com os seus.
 *   Os outros podem ser de gente que você nem enxerga: `GET /subgrupos` é
 *   escopado (`subgrupos_service.listar_pagina`), então `user`/`manager` só
 *   recebem os que participam. Mostrar o id ali não seria honestidade, seria
 *   despejar identificador de subgrupo alheio ao lado dos nomes.
 *
 * ⚠️ **O catálogo É a régua de visibilidade**, e não uma lista de conveniência:
 * ele já vem recortado pelo servidor. Por isso o filtro aqui é "está no
 * catálogo?" e não uma segunda checagem de permissão inventada no front.
 *
 * ⚠️ Enquanto o catálogo não chegou, devolve lista VAZIA -- e a etiqueta vira
 * o travessão por um instante, em vez de piscar ids crus.
 */
export function useNomesDeSubgruposVisiveis(): (ids: string[] | undefined) => string[] {
  const query = useTodosOsSubgrupos();
  useToastOnQueryError(query.error, "Não foi possível carregar os subgrupos.");

  const subgrupos = query.data;

  return useCallback(
    (ids: string[] | undefined) =>
      (ids || [])
        .map((id) => subgrupos?.find((s) => s.subgrupo_id === id)?.nome)
        .filter((nome): nome is string => Boolean(nome)),
    [subgrupos],
  );
}
