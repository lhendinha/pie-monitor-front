import { useQuery } from "@tanstack/react-query";

import { listarClientes, listarOpcoesProcesso, listarSubgrupos } from "../services";
import { useToastOnQueryError } from "../services/queryClient";
import { qk } from "../services/queryKeys";
import { TETO_POR_PAGINA } from "../constants";
import type { Cliente, OpcaoProcesso, Subgrupo } from "../types";

/** As quatro listas que a tela de Processos usa pra traduzir id em nome:
 * subgrupos, clientes, fases e situações.
 *
 * Todas com `TETO_POR_PAGINA` e **as mesmas queryKeys** que os
 * formulários usam -- é isso que faz o cache ser compartilhado em vez de
 * refazer o fetch só porque outra tela montou.
 *
 * Precisa do conjunto inteiro, não de uma página: um processo qualquer da
 * lista pode apontar pra qualquer subgrupo ou cliente, e com meia lista o
 * nome viraria o id cru na tela.
 */
export function useCatalogosDeProcesso() {
  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    queryKey: qk.subgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");

  const clientesQuery = useQuery<{ clientes: Cliente[] }>({
    queryKey: qk.clientes({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarClientes({ tamanhoPagina: TETO_POR_PAGINA }),
  });

  const fasesQuery = useQuery<{ opcoes: OpcaoProcesso[] }>({
    queryKey: qk.opcoesProcesso("fase", { tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarOpcoesProcesso("fase", { tamanhoPagina: TETO_POR_PAGINA }),
  });

  const situacoesQuery = useQuery<{ opcoes: OpcaoProcesso[] }>({
    queryKey: qk.opcoesProcesso("situacao", { tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarOpcoesProcesso("situacao", { tamanhoPagina: TETO_POR_PAGINA }),
  });

  const subgrupos = subgruposQuery.data?.subgrupos || [];
  const clientes = clientesQuery.data?.clientes || [];
  const fases = fasesQuery.data?.opcoes || [];
  const situacoes = situacoesQuery.data?.opcoes || [];

  /** Cai pro próprio id quando o nome não é encontrado. Mostrar o id é feio,
   * mas some da tela é pior -- e acontece de verdade enquanto as listas
   * ainda estão carregando. */
  const rotuloOpcao = (lista: OpcaoProcesso[], id?: string | null) =>
    lista.find((o) => o.opcao_id === id)?.rotulo || id || "";

  return {
    subgrupos,
    clientes,
    fases,
    situacoes,
    subgrupoNome: (id: string) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id,
    clienteNome: (id: string) => clientes.find((c) => c.cliente_id === id)?.nome || id,
    /** Nomes dos clientes de um processo, já juntos pra caber numa célula.
     * Processo sem cliente devolve string vazia -- quem chama decide o que
     * mostrar no lugar. */
    clientesNomes: (p: { cliente_ids?: string[] }) =>
      (p.cliente_ids || [])
        .map((id) => clientes.find((c) => c.cliente_id === id)?.nome || id)
        .join(", "),
    faseRotulo: (id?: string | null) => rotuloOpcao(fases, id),
    situacaoRotulo: (id?: string | null) => rotuloOpcao(situacoes, id),
  };
}
