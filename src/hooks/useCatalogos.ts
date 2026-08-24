import { useQuery } from "@tanstack/react-query";

import {
  listarClientes,
  listarOpcoesProcesso,
  listarSubgrupos,
  listarTodosOsMembrosDoGrupo,
} from "../services";
import { todasAsPaginas } from "../services/api/paginacao";
import { qk } from "../services/queryKeys";
import type { Cliente, Membro, OpcaoProcesso, Subgrupo, TipoOpcaoProcesso } from "../types";

/** Os catálogos do sistema, cada um com UMA função de busca.
 *
 * 🔴 Existe porque a mesma `queryKey` estava sendo usada por duas funções de
 * busca diferentes. Depois que `useCatalogosDeProcesso` passou a percorrer
 * todas as páginas, nove outras consultas continuaram pedindo uma página só
 * -- na MESMA chave. O React Query deduplica por chave e roda o `queryFn` de
 * quem registrar primeiro, então o resultado dependia da ordem de montagem.
 *
 * Pior: `CamposProcesso` monta DENTRO da `ProcessosPage`. Abrir "Novo
 * processo" refetchava a chave compartilhada com a versão de uma página e
 * sobrescrevia o catálogo completo -- num grupo com 150 clientes, o nome na
 * tabela virava o id cru, e só voltava ao normal remontando a página.
 *
 * A regra que sai disso: **uma chave, uma função de busca.** Toda tela que
 * precisa de um catálogo usa o hook daqui.
 */
export function useTodosOsClientes() {
  return useQuery({
    queryKey: qk.todosOsClientes(),
    queryFn: () => todasAsPaginas<Cliente>(listarClientes, "clientes"),
  });
}

export function useTodosOsSubgrupos() {
  return useQuery({
    queryKey: qk.todosOsSubgrupos(),
    queryFn: () => todasAsPaginas<Subgrupo>(listarSubgrupos, "subgrupos"),
  });
}

export function useOpcoesDeProcesso(tipo: TipoOpcaoProcesso) {
  return useQuery({
    queryKey: qk.todasAsOpcoes(tipo),
    queryFn: () => todasAsPaginas<OpcaoProcesso>((o) => listarOpcoesProcesso(tipo, o), "opcoes"),
  });
}

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
