import { listarMembrosDoGrupo } from "../services";
import { qk } from "../services/queryKeys";
import { PAGINA_DE_OPCOES } from "../constants/busca";
import { useListaBuscavel } from "./useListaBuscavel";
import type { OpcoesBuscaveis } from "../types";
import type { RespostaDeMembros } from "../types/respostas";

/** As pessoas do grupo, pra escolher num filtro.
 *
 * 🔴 **`GET /grupos/membros` tem piso `manager`** -- pra quem é `user` esta
 * lista responde 403. Quem oferece a pílula precisa **esconder a opção**, não
 * mostrá-la quebrada: é o mesmo princípio que `podeDestruirDocumento` já
 * escreve, *"não oferecer o que a API vai negar -- um controle que existe e
 * falha em 403 é pior que um ausente, porque a pessoa tenta, espera, e recebe
 * uma recusa que parece defeito"*.
 *
 * Use `podeListarPessoas()` pra decidir, e não uma checagem própria de papel
 * espalhada por tela.
 */
export function usePessoasBuscaveis(): OpcoesBuscaveis {
  return useListaBuscavel<RespostaDeMembros>(
    (busca) => qk.membros({ ...PAGINA_DE_OPCOES, busca }),
    (busca) => listarMembrosDoGrupo({ ...PAGINA_DE_OPCOES, busca }) as Promise<RespostaDeMembros>,
    /* Apelido quando existe, e-mail quando não -- quem foi convidado hoje
       ainda não tem apelido, e some de um seletor que só oferece apelido. */
    (r) => (r.membros || []).map((m) => ({ value: m.email, label: m.apelido || m.email })),
  );
}
