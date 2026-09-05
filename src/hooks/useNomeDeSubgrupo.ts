import { useCallback } from "react";

import { useTodosOsSubgrupos } from "./useTodosOsSubgrupos";
import { useToastOnQueryError } from "../services/queryClient";

/** Traduz `subgrupo_id` no nome do subgrupo, em qualquer tela.
 *
 * UMA função para as sete telas que mostram o subgrupo de cada item: quem
 * participa de mais de um subgrupo precisa saber, ao ler uma lista ou
 * escolher um processo, de qual subgrupo cada item é. A régua do projeto é
 * que a terceira cópia vira função -- aqui seriam oito.
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
