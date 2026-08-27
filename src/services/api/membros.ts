import { chamar } from "./client";
import { todasAsPaginas } from "../../utils/paginacao";
import type { DadosDoMembro } from "../../types/requisicoes";
import type { Membro, OpcoesListarMembros } from "../../types";

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
  const { pagina, tamanhoPagina, busca } = opcoes;
  return chamar("/grupos/membros", {
    query: {
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
      busca: busca || undefined,
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
  // ⚠️ `todasAsPaginas` e não um laço próprio. O laço que estava aqui não
  // tinha as duas proteções que o helper ganhou horas depois, na mesma
  // auditoria: parar quando a página vem VAZIA, e tolerar `total`/
  // `total_paginas` ausentes. Sem elas, uma resposta sem contagem fazia o
  // laço girar pra sempre martelando `GET /grupos/membros`.
  return { membros: await todasAsPaginas<Membro>(listarMembrosDoGrupo, "membros") };
}

export function listarMembrosDoSubgrupo(subgrupoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`);
}

export function adicionarMembro(subgrupoId: string, email: string) {
  return chamar(`/subgrupos/${subgrupoId}/membros`, { method: "POST", body: { email } });
}

/** `true` quando a pessoa ENTROU agora; `false` quando já era membro.
 *
 * ⚠️ A comparação de string fica AQUI, num lugar só.
 *
 * A tela decidia o texto do toast comparando `resp.mensagem === "adicionado"`
 * direto no componente -- contrato não declarado, espalhado, que quebraria em
 * silêncio se o servidor trocasse a palavra. O sinal mais robusto seria o
 * status HTTP (o servidor responde 201 quando adiciona e 200 quando já era
 * membro), mas `chamar` descarta o status no sucesso, e expô-lo por causa
 * deste único caso não se paga. Centralizar é o ganho real: se a palavra
 * mudar, muda um lugar. */
export function entrouAgora(resposta: { mensagem?: string }): boolean {
  return resposta.mensagem === "adicionado";
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
