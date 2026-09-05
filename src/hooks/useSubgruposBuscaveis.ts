import { listarSubgrupos } from "../services";
import { qk } from "../services/queryKeys";
import { PAGINA_DE_OPCOES } from "../constants/busca";
import { useListaBuscavel } from "./useListaBuscavel";
import type { OpcoesBuscaveis } from "../types";
import type { RespostaDeSubgrupos } from "../types/respostas";

/** Os subgrupos do grupo, pra escolher num filtro ou num campo: primeira
 * página e busca no servidor (`useListaBuscavel`).
 *
 * @param sempreLigada Pede a primeira página JÁ NA MONTAGEM, sem esperar a
 * pílula abrir.
 *
 * Existe pro Kanban e pra Agenda, e por um motivo específico: nelas o
 * subgrupo não é filtro, é QUAL QUADRO a tela mostra. Sem uma lista na
 * montagem não há como escolher um padrão, e a tela abriria em branco
 * esperando um clique que quase sempre é o mesmo.
 *
 * ⚠️ Continua sendo a primeira PÁGINA (50), não o catálogo -- o que mudou é
 * o momento, não o tamanho. */
export function useSubgruposBuscaveis(sempreLigada = false): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeSubgrupos>(
    (busca) => qk.subgrupos({ ...PAGINA_DE_OPCOES, busca }),
    (busca) => listarSubgrupos({ ...PAGINA_DE_OPCOES, busca }) as Promise<RespostaDeSubgrupos>,
    (r) => (r.subgrupos || []).map((s) => ({ value: s.subgrupo_id, label: s.nome })),
    sempreLigada,
  );
}
