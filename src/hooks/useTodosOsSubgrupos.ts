import { useQuery } from "@tanstack/react-query";

import { listarSubgrupos } from "../services";
import { todasAsPaginas } from "../utils/paginacao";
import { qk } from "../services/queryKeys";
import type { Subgrupo } from "../types";

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
/* ⚠️ SEM `staleTime` aqui, e a ausência é deliberada.
 *
 * 🔴 Uma auditoria apontou que `todasAsPaginas` sobre uma coleção que cresce
 * sem limite refaria a caminhada a cada montagem e a cada foco de janela, e
 * eu pus cinco minutos de validade sem medir. Depois medi, em produção:
 *
 *     clientes 2 | subgrupos 8 | atendimentos 1 | membros 15 | opções 88
 *
 * Tudo cabe em UMA página. A "caminhada de páginas" que eu disse estar
 * economizando é uma requisição, e o React Query já deduplica chamadas
 * simultâneas da mesma chave -- então nem o caso de vários componentes
 * montando juntos o `staleTime` resolvia.
 *
 * E o que ele custava era real: o canal WebSocket só invalida notificação,
 * nada mais. A ÚNICA coisa que trazia dado de outra pessoa era o
 * `refetchOnWindowFocus`, e cinco minutos de validade é exatamente o que o
 * desliga. Cenário concreto: a sócia cadastra um cliente, você volta pra
 * aba, e o select de "Novo processo" não o mostra por até cinco minutos --
 * num sistema de escritório, isso faz a pessoa cadastrar de novo.
 *
 * Se um dia atendimentos passar de algumas centenas, o ajuste certo não é
 * `staleTime`: é parar de caminhar todas as páginas só pra rotular tarefa,
 * e buscar os assuntos dos ids que estão na tela.
 */
/* 🔴 `useTodosOsClientes` foi REMOVIDO, e a ausência é o ponto.
 *
 * Era o último lugar que baixava o catálogo inteiro de clientes -- a única
 * das listas daqui que cresce sem limite de verdade. Os três consumidores
 * viraram busca: a coluna da tabela lê `cliente_nomes` (que vem no próprio
 * processo), e os dois seletores pedem a primeira página quando abrem
 * (`useClientesBuscaveis`, `CampoDeClientes`).
 *
 * Os hooks que sobraram continuam percorrendo todas as páginas de propósito:
 * subgrupo e opção de processo são cadastro de escritório, medido em 8 e 88
 * itens em produção -- lá a caminhada é UMA requisição. */
export function useTodosOsSubgrupos() {
  return useQuery({
    queryKey: qk.todosOsSubgrupos(),
    queryFn: () => todasAsPaginas<Subgrupo>(listarSubgrupos, "subgrupos"),
  });
}
