import { useQuery } from "@tanstack/react-query";

import { listarClientes, listarOpcoesProcesso, listarSubgrupos } from "../services";
import { useToastOnQueryError } from "../services/queryClient";
import { qk } from "../services/queryKeys";
import { TETO_POR_PAGINA } from "../constants";
import { todasAsPaginas } from "../services/api/paginacao";
import type { Cliente, OpcaoProcesso, Subgrupo } from "../types";
import type { ComClientes } from "../types";
import type {
  RespostaDeClientes,
  RespostaDeOpcoes,
  RespostaDeSubgrupos,
} from "../types/respostas";

/** As quatro listas que a tela de Processos usa pra traduzir id em nome:
 * subgrupos, clientes, fases e situações.
 *
 * ⚠️ `todasAsPaginas` e não uma página só. O docstring abaixo sempre disse
 * que "precisa do conjunto inteiro, não de uma página" -- mas o código
 * pedia `TETO_POR_PAGINA`, que é o MÁXIMO que a API aceita (100). Acima de
 * 100 clientes a lista vinha cortada e o `rotuloOpcao` caía pro id cru na
 * tela, com o fallback documentado como se fosse só "ainda carregando". O
 * padrão de percorrer páginas já existia em `useTarefasDoQuadro`.
 *
 * As **mesmas queryKeys** que os formulários usam -- é isso que faz o cache
 * ser compartilhado em vez de refazer o fetch só porque outra tela montou.
 *
 * Precisa do conjunto inteiro, não de uma página: um processo qualquer da
 * lista pode apontar pra qualquer subgrupo ou cliente, e com meia lista o
 * nome viraria o id cru na tela.
 */
export function useCatalogosDeProcesso() {
  const subgruposQuery = useQuery<RespostaDeSubgrupos>({
    queryKey: qk.subgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: async () => ({ subgrupos: await todasAsPaginas<Subgrupo>(listarSubgrupos, "subgrupos") }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");

  const clientesQuery = useQuery<RespostaDeClientes>({
    queryKey: qk.clientes({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: async () => ({ clientes: await todasAsPaginas<Cliente>(listarClientes, "clientes") }),
  });

  const fasesQuery = useQuery<RespostaDeOpcoes>({
    queryKey: qk.opcoesProcesso("fase", { tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: async () => ({
      opcoes: await todasAsPaginas<OpcaoProcesso>((o) => listarOpcoesProcesso("fase", o), "opcoes"),
    }),
  });

  const situacoesQuery = useQuery<RespostaDeOpcoes>({
    queryKey: qk.opcoesProcesso("situacao", { tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: async () => ({
      opcoes: await todasAsPaginas<OpcaoProcesso>((o) => listarOpcoesProcesso("situacao", o), "opcoes"),
    }),
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
    /** Lista vazia significa DUAS coisas -- "não existe nenhum" e "ainda não
     * chegou" -- e quem lê precisa distinguir. Sem isto, o modal de novo
     * processo anunciava "Crie um subgrupo primeiro" durante o
     * carregamento, afirmando uma coisa falsa pra quem tem subgrupos. */
    carregandoSubgrupos: subgruposQuery.isPending,
    /** Clientes, fases e situações -- as três listas que alimentam os
     * seletores e os chips de filtro. Uma flag só porque quem consome trata
     * as três igual: enquanto qualquer uma falta, os controles não podem
     * afirmar que a opção procurada não existe. */
    carregandoCatalogos:
      clientesQuery.isPending || fasesQuery.isPending || situacoesQuery.isPending,
    subgrupos,
    clientes,
    fases,
    situacoes,
    subgrupoNome: (id: string) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id,
    clienteNome: (id: string) => clientes.find((c) => c.cliente_id === id)?.nome || id,
    /** Nomes dos clientes de um processo, já juntos pra caber numa célula.
     * Processo sem cliente devolve string vazia -- quem chama decide o que
     * mostrar no lugar. */
    clientesNomes: (p: ComClientes) =>
      (p.cliente_ids || [])
        .map((id) => clientes.find((c) => c.cliente_id === id)?.nome || id)
        .join(", "),
    faseRotulo: (id?: string | null) => rotuloOpcao(fases, id),
    situacaoRotulo: (id?: string | null) => rotuloOpcao(situacoes, id),
  };
}
