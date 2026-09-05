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
     * A versão anterior desembrulhava dentro do `queryFn`, então o cache
     * ficava com `Membro[]` -- enquanto os três consumidores vivos dessa
     * mesma chave (SinoDeNotificacoes, AtendimentosPage, MembrosDoSubgrupo)
     * usam `listarTodosOsMembrosDoGrupo` direto e guardam `{ membros }`.
     *
     * Duas formas na mesma chave é exatamente o defeito que este módulo
     * existe pra eliminar: o React Query deduplica por chave e roda o
     * `queryFn` de quem montar primeiro, então quem lesse `.membros` de um
     * array -- ou iterasse um objeto -- dependia da ordem de montagem.
     * Ninguém usa este hook ainda; o primeiro que usasse reintroduziria o
     * problema.
     *
     * Com `select`, o cache é idêntico ao dos outros e a transformação
     * acontece só na saída deste hook. */
    queryFn: listarTodosOsMembrosDoGrupo,
    select: (d): Membro[] => d.membros,
    enabled: habilitado,
  });
}
