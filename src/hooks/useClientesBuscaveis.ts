import { listarClientes } from "../services";
import { qk } from "../services/queryKeys";
import { PAGINA_DE_OPCOES } from "../constants/busca";
import { useListaBuscavel } from "./useListaBuscavel";
import type { OpcoesBuscaveis } from "../types";
import type { RespostaDeClientes } from "../types/respostas";

/** Os clientes do grupo, pra escolher num filtro ou num campo: primeira
 * página e busca no servidor (`useListaBuscavel`). */
export function useClientesBuscaveis(): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeClientes>(
    (busca) => qk.clientes({ ...PAGINA_DE_OPCOES, busca }),
    (busca) => listarClientes({ ...PAGINA_DE_OPCOES, busca }) as Promise<RespostaDeClientes>,
    (r) => (r.clientes || []).map((c) => ({ value: c.cliente_id, label: c.nome })),
  );
}
