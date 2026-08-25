
import { useToastOnQueryError } from "../services/queryClient";
import { useOpcoesDeProcesso, useTodosOsSubgrupos } from "./useCatalogos";
import type { OpcaoProcesso } from "../types";
import type { ComClientes } from "../types";

/** As listas que a tela de Processos usa pra traduzir id em nome: subgrupos,
 * fases e situações.

 * 🔴 Clientes NÃO estão mais aqui. Este hook baixava o catálogo inteiro no
 * carregamento da tela, e com 5.000 clientes a coluna "Cliente" mostrava id
 * cru por 3,8 segundos -- medido em Chrome. Quem resolve nome de cliente hoje
 * é o próprio processo (`cliente_nomes`, que vem na resposta), e quem oferece
 * cliente pra ESCOLHER é a busca (`useClientesBuscaveis`), que só pede alguma
 * coisa quando a pessoa abre o filtro.
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

  const fasesQuery = useOpcoesDeProcesso("fase");
  const situacoesQuery = useOpcoesDeProcesso("situacao");

  const subgrupos = subgruposQuery.data || [];
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
    /** Fase e situação -- as duas listas que alimentam os seletores e os
     * chips de filtro. Uma flag só porque quem consome trata as duas igual:
     * enquanto qualquer uma falta, os controles não podem afirmar que a
     * opção procurada não existe. */
    carregandoCatalogos: fasesQuery.isPending || situacoesQuery.isPending,
    /** A busca das duas FALHOU.
     *
     * 🔴 Sem isto o painel oferecia "Nenhuma opção disponível." depois de uma
     * consulta que nem chegou a responder -- uma afirmação sobre o cadastro
     * do escritório, feita a partir de um erro de rede. O toast que dizia a
     * verdade some em 4,5s; a frase errada fica. Ver `FalhaDoPainel`. */
    erroNasFases: fasesQuery.isError,
    erroNasSituacoes: situacoesQuery.isError,
    recarregarFases: () => void fasesQuery.refetch(),
    recarregarSituacoes: () => void situacoesQuery.refetch(),
    subgrupos,
    fases,
    situacoes,
    subgrupoNome: (id: string) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id,
    /** Nomes dos clientes de um processo, já juntos pra caber numa célula.
     * Processo sem cliente devolve string vazia -- quem chama decide o que
     * mostrar no lugar.
     *
     * 🔴 Lê `cliente_nomes`, que vem DENTRO do processo. Antes procurava id
     * por id no catálogo -- e por isso a coluna mostrava o id cru até o
     * catálogo inteiro terminar de chegar: medido em Chrome, 3,8 segundos
     * com 5.000 clientes.
     *
     * Com os dois SELETORES de cliente desta tela trocados por busca (o chip
     * de filtro e o campo do formulário), o catálogo deixou de ser baixado
     * aqui -- que era o que faltava. */
    clientesNomes: (p: ComClientes) =>
      (p.cliente_nomes?.length ? p.cliente_nomes : p.cliente_ids || []).join(", "),
    faseRotulo: (id?: string | null) => rotuloOpcao(fases, id),
    situacaoRotulo: (id?: string | null) => rotuloOpcao(situacoes, id),
  };
}
