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
    queryFn: async () => (await listarTodosOsMembrosDoGrupo()).membros as Membro[],
    enabled: habilitado,
  });
}
