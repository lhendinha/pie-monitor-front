import type { FiltrosProcessos } from "../../types";

// ultima_verificacao muda por um job no backend, sem ação de usuário -- e
// um apelido editado por outra pessoa também só apareceria aqui ao trocar
// de aba/foco. Revalida sozinho enquanto a aba estiver aberta e em foco (o
// React Query já pausa o polling em background por padrão).
export const INTERVALO_POLLING_PROCESSOS_MS = 60_000;

export const FILTROS_PROCESSOS_VAZIOS: FiltrosProcessos = {
  clienteId: "",
  clienteNome: "",
  faseIds: [],
  situacaoIds: [],
  dataVerificarAte: "",
  prazoFinalAte: "",
  responsavelId: "",
};


/** Cabeçalhos da tabela de Processos, na ordem do artifact.
 *
 * Aqui e não dentro do componente: é dado, e dado tem lugar. Quando a
 * tabela ganhar ordenação por coluna, é esta lista que vira a fonte da
 * chave de ordenação -- e ela precisa ser legível sem montar React. */
export const COLUNAS_PROCESSOS = [
  "Processo",
  "Cliente",
  "Subgrupo",
  "Situação",
  "Última movimentação",
  "Prazo final",
  // 🔴 ACRESCENTADA em 26/08/2026 -- nada saiu.
  //
  // A demonstração da feature tinha posto Responsável no lugar de "Última
  // movimentação", pra caber. Medido depois: os 10 processos de produção têm
  // `ultima_mov_tipo`, `ultima_mov_data` e `ultima_verificacao` preenchidos --
  // e aquela coluna é o ÚNICO lugar onde se percebe, pro acervo inteiro, que
  // a verificação parou (na tela do processo vê-se um; aqui, todos).
  //
  // `Tabela` já rola dentro do próprio container (`Table.ScrollArea`), então
  // a sétima não faz a PÁGINA rolar de lado.
  "Responsável",
] as const;

/** O valor da pílula de responsável que significa "os órfãos".
 *
 * ⚠️ Vive só na TELA. Ele nunca vai pra query string: `useFiltrosProcessos`
 * o traduz pro booleano `semResponsavel`, porque uma string vazia seria
 * descartada por `montarQuery` e o filtro sumiria em silêncio.
 */
export const SEM_RESPONSAVEL = "__sem__";

/** "eu", resolvido no front pro e-mail da sessão. O servidor não precisa
 * saber o que "eu" significa. */
export const RESPONSAVEL_EU = "__eu__";
