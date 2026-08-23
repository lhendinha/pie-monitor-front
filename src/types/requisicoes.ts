/** O que as chamadas de API MANDAM -- o espelho de `respostas.ts`.
 *
 * Vive em `types` e não ao lado de cada função de `services/api` porque não
 * é tipo de uma página: quem chama a rota pode ser qualquer tela, e o
 * formato do corpo é contrato com o servidor, não detalhe de quem
 * apresenta.
 */

/** A edição de membro manda todos os campos juntos: a rota substitui o
 * conjunto, não faz merge.
 *
 * ⚠️ `type`, e não `interface`: isto vai direto como `body`, que é
 * `Record<string, unknown>`. Interface não é atribuível a um Record -- o TS
 * não lhe dá index signature implícita; um type alias tem. */
export type DadosDoMembro = {
  apelido: string;
  grupo_id: string;
  papel: string;
  subgrupos: string[];
};

/** PATCH parcial da coluna do quadro: campo omitido não é tocado. */
export type CamposDaColuna = {
  nome?: string;
  ordem?: number;
};
