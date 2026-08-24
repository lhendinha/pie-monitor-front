import { chamar } from "./client";
import { TETO_POR_PAGINA } from "../../constants";
import type { DadosDoMembro } from "../../types/requisicoes";
import type { Membro } from "../../types";

interface OpcoesListarMembros {
  pagina?: number;
  tamanhoPagina?: number;
}

/** Uma página de `GET /grupos/membros`.
 *
 * 🔴 A rota É paginada no servidor (`tamanho_pagina` padrão 10). Este módulo
 * chamava sem query nenhuma e o comentário da MembrosPage afirmava o
 * contrário -- "devolve o grupo inteiro de uma vez". Resultado: a partir da
 * 11ª pessoa o grupo ficava invisível, e como o recorte local usava
 * `pessoas.length` como total, a `Pagination` se escondia sozinha. Não havia
 * página 2 pra clicar.
 */
export function listarMembrosDoGrupo(opcoes: OpcoesListarMembros = {}) {
  const { pagina, tamanhoPagina } = opcoes;
  return chamar("/grupos/membros", {
    query: {
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

/** TODAS as pessoas do grupo, percorrendo as páginas.
 *
 * Quem resolve apelido e papel (o sino, o Kanban, a Agenda, os seletores de
 * responsável) precisa do conjunto inteiro: com meia lista, quem ficou de
 * fora aparece como e-mail cru e some dos seletores. Mesmo laço de
 * `useTarefasDoQuadro`.
 */
export async function listarTodosOsMembrosDoGrupo(): Promise<{ membros: Membro[] }> {
  const juntos: Membro[] = [];
  let pagina = 1;
  for (;;) {
    const resposta = (await listarMembrosDoGrupo({
      pagina,
      tamanhoPagina: TETO_POR_PAGINA,
    })) as { membros: Membro[]; total: number; total_paginas: number };
    juntos.push(...resposta.membros);
    // Para quando juntou o `total` anunciado. O segundo limite é rede de
    // segurança: se as duas contas discordarem, melhor parar que girar.
    if (juntos.length >= resposta.total || pagina >= resposta.total_paginas) break;
    pagina += 1;
  }
  return { membros: juntos };
}

export function listarMembrosDoSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`);
}

export function adicionarMembro(subgrupoId: string, email: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`, { method: "POST", body: { email } });
}

export function removerMembro(subgrupoId: string, email: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros/${encodeURIComponent(email)}`, { method: "DELETE" });
}

export function atualizarMembro(
  email: string,
  dados: DadosDoMembro
) {
  return chamar(`/grupos/membros/${encodeURIComponent(email)}`, { method: "PATCH", body: dados });
}
