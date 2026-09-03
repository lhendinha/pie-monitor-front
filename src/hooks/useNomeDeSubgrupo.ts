import { useCallback } from "react";

import { useTodosOsSubgrupos } from "./useCatalogos";
import { useToastOnQueryError } from "../services/queryClient";

/** Traduz `subgrupo_id` no nome do subgrupo, em qualquer tela.
 *
 * 🔴 **Nasceu de uma linha que já existia em `useCatalogosDeProcesso`** e que
 * sete telas passaram a precisar (02/09/2026): quem participa de mais de um
 * subgrupo não conseguia dizer, ao ler uma lista ou escolher um processo, de
 * qual subgrupo cada item era. A régua do projeto é que a terceira cópia vira
 * função -- aqui seriam oito.
 *
 * ⚠️ **Custa UMA requisição no total, não uma por tela.** A chave
 * `qk.todosOsSubgrupos()` é compartilhada e o React Query deduplica: a segunda
 * tela que chamar já encontra o catálogo no cache. Subgrupo é cadastro de
 * escritório -- 8 em produção --, e por isso `useTodosOsSubgrupos` percorre
 * todas as páginas numa ida só.
 *
 * ⚠️ **Cai para o ID quando o nome não resolve**, e isso é o comportamento
 * certo, não um descuido: é o que sobra quando o subgrupo foi apagado, e
 * mostrar algo é melhor que a etiqueta sumir sem explicação. Mesma decisão de
 * `EtiquetasDeSubgrupo` e de `LinhaDaInscricao`.
 *
 * 🔴 **Enquanto o catálogo não chegou, TAMBÉM devolve o id.** Não há estado de
 * "carregando" aqui de propósito: quem consome desenha uma etiqueta dentro de
 * uma linha de tabela, e trocar a etiqueta por um esqueleto mexeria na altura
 * da linha -- que é a medida que o roteiro de produção afere (61px em
 * Membros). O id aparece por um instante e vira nome; a linha não pula.
 *
 * ⚠️ O erro vira toast aqui, uma vez só. Sem isto, sete telas ou repetiriam o
 * `useToastOnQueryError` ou -- pior -- nenhuma avisaria, e o catálogo falho
 * apareceria como uma tela cheia de ids crus sem explicação.
 */
export function useNomeDeSubgrupo(): (id: string) => string {
  const query = useTodosOsSubgrupos();
  useToastOnQueryError(query.error, "Não foi possível carregar os subgrupos.");

  const subgrupos = query.data;

  return useCallback(
    (id: string) => subgrupos?.find((s) => s.subgrupo_id === id)?.nome || id,
    [subgrupos],
  );
}

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
