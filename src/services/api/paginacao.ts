import { TETO_POR_PAGINA } from "../../constants";

interface Envelope {
  total: number;
  total_paginas: number;
  [chave: string]: unknown;
}

interface OpcoesDePagina {
  pagina?: number;
  tamanhoPagina?: number;
}

/** Junta TODAS as páginas de uma listagem paginada.
 *
 * 🔴 Existe porque pedir `tamanhoPagina: 100` -- o máximo que a API aceita --
 * era tratado como "traz tudo" em seis telas. Acima de 100 itens a lista
 * vinha cortada em silêncio: o nome virava o id cru na tela, e o fallback
 * estava documentado como se fosse só "ainda carregando".
 *
 * Mesmo laço de `useTarefasDoQuadro`, que já fazia certo: para quando juntou
 * o `total` anunciado, com o número de páginas como rede de segurança contra
 * girar para sempre se as duas contas discordarem.
 */
export async function todasAsPaginas<T>(
  buscar: (opcoes: OpcoesDePagina) => Promise<unknown>,
  chave: string,
): Promise<T[]> {
  const juntos: T[] = [];
  let pagina = 1;
  for (;;) {
    const resposta = (await buscar({ pagina, tamanhoPagina: TETO_POR_PAGINA })) as Envelope;
    const daPagina = (resposta[chave] as T[]) || [];
    juntos.push(...daPagina);
    if (
      daPagina.length === 0 ||
      juntos.length >= (resposta.total ?? juntos.length) ||
      pagina >= (resposta.total_paginas ?? 1)
    ) {
      break;
    }
    pagina += 1;
  }
  return juntos;
}
