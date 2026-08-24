
import { useToastOnQueryError } from "../services/queryClient";
import { useOpcoesDeProcesso, useTodosOsClientes, useTodosOsSubgrupos } from "./useCatalogos";
import type { OpcaoProcesso } from "../types";
import type { ComClientes } from "../types";

/** As quatro listas que a tela de Processos usa pra traduzir id em nome:
 * subgrupos, clientes, fases e situações.
 *
 * ⚠️ Vem tudo de `useCatalogos.ts`, que é onde cada catálogo tem UMA função
 * de busca.
 *
 * Antes as consultas viviam aqui e dividiam a `queryKey` com nove outras
 * espalhadas pelas telas, que pediam uma página só. O React Query deduplica
 * por chave e roda o `queryFn` de quem registra primeiro -- e
 * `CamposProcesso`, que monta DENTRO da ProcessosPage, sobrescrevia o
 * catálogo completo com a versão truncada em 100.
 *
 * Precisa do conjunto inteiro, não de uma página: um processo qualquer da
 * lista pode apontar pra qualquer subgrupo ou cliente, e com meia lista o
 * nome viraria o id cru na tela.
 */
export function useCatalogosDeProcesso() {
  // Uma chave, uma função de busca -- ver `useCatalogos.ts`.
  const subgruposQuery = useTodosOsSubgrupos();
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");

  const clientesQuery = useTodosOsClientes();
  const fasesQuery = useOpcoesDeProcesso("fase");
  const situacoesQuery = useOpcoesDeProcesso("situacao");

  const subgrupos = subgruposQuery.data || [];
  const clientes = clientesQuery.data || [];
  const fases = fasesQuery.data || [];
  const situacoes = situacoesQuery.data || [];

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
