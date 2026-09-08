import { listarClientes } from "../services";
import { qk } from "../services/queryKeys";
import { PAGINA_DE_OPCOES } from "../constants/busca";
import { useListaBuscavel } from "./useListaBuscavel";
import type { OpcoesBuscaveis } from "../types";
import type { RespostaDeClientes } from "../types/respostas";

/** Os clientes do grupo, pra escolher num filtro ou num campo: primeira
 * página e busca no servidor (`useListaBuscavel`).
 *
 * @param sempreLigada Pede a primeira página JÁ NA MONTAGEM, sem esperar o
 * painel abrir.
 *
 * 🔴 Existe para quem precisa do NOME sem ter aberto o seletor: a lista de
 * faturas emitidas traz só `cliente_id`, e sem a lista carregada a coluna
 * mostrava o id cru. É a mesma prop que `useSubgruposBuscaveis` já tem, e
 * pela mesma razão.
 *
 * ⚠️ Continua sendo a primeira PÁGINA, não o catálogo -- o que muda é o
 * momento. Cliente fora dela cai para o id, que é a régua do projeto. */
export function useClientesBuscaveis(sempreLigada = false): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeClientes>(
    (busca) => qk.clientes({ ...PAGINA_DE_OPCOES, busca }),
    (busca) => listarClientes({ ...PAGINA_DE_OPCOES, busca }) as Promise<RespostaDeClientes>,
    (r) => (r.clientes || []).map((c) => ({ value: c.cliente_id, label: c.nome })),
    sempreLigada,
  );
}
