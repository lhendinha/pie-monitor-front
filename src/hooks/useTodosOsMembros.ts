import { useQuery } from "@tanstack/react-query";

import { listarTodosOsMembrosDoGrupo } from "../services";
import { qk } from "../services/queryKeys";
import type { Membro } from "../types";

/** Um dos catálogos do sistema -- a regra "uma chave, uma função de busca" e
 * a história dela estão em `useTodosOsSubgrupos`. */
export function useTodosOsMembros(habilitado = true) {
  return useQuery({
    queryKey: qk.todosOsMembros(),
    /* 🔴 `queryFn` guarda a resposta INTEIRA; `select` é que expõe o array.
     *
     * Desembrulhar dentro do `queryFn` deixaria o cache com `Membro[]`,
     * enquanto os consumidores da mesma chave (`MembrosDoSubgrupo`) usam
     * `listarTodosOsMembrosDoGrupo` direto e guardam `{ membros }`. Duas
     * formas na mesma chave é exatamente o defeito que este módulo existe
     * pra eliminar: o React Query deduplica por chave e roda o `queryFn` de
     * quem montar primeiro, então quem lesse `.membros` de um array -- ou
     * iterasse um objeto -- dependeria da ordem de montagem.
     *
     * Com `select`, o cache é idêntico ao dos outros e a transformação
     * acontece só na saída deste hook. */
    queryFn: listarTodosOsMembrosDoGrupo,
    select: (d): Membro[] => d.membros,
    enabled: habilitado,
  });
}
