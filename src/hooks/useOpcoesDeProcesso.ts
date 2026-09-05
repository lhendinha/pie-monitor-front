import { useQuery } from "@tanstack/react-query";

import { listarOpcoesProcesso } from "../services";
import { todasAsPaginas } from "../utils/paginacao";
import { qk } from "../services/queryKeys";
import type { OpcaoProcesso, TipoOpcaoProcesso } from "../types";

/** Um dos catálogos do sistema -- a regra "uma chave, uma função de busca" e
 * a história dela estão em `useTodosOsSubgrupos`. */
export function useOpcoesDeProcesso(tipo: TipoOpcaoProcesso) {
  return useQuery({
    queryKey: qk.todasAsOpcoes(tipo),
    queryFn: () => todasAsPaginas<OpcaoProcesso>((o) => listarOpcoesProcesso(tipo, o), "opcoes"),
  });
}
