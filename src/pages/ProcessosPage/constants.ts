import type { EstadoDoAchado } from "../../types";

// ultima_verificacao muda por um job no backend, sem ação de usuário -- e
// um apelido editado por outra pessoa também só apareceria aqui ao trocar
// de aba/foco. Revalida sozinho enquanto a aba estiver aberta e em foco (o
// React Query já pausa o polling em background por padrão).
export const INTERVALO_POLLING_PROCESSOS_MS = 60_000;


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

/** Colunas da prévia da importação por OAB, na ordem do desenho.
 *
 * A primeira é a de marcar: sem nome, mas existe para a contagem de colunas
 * bater com a das células -- é o que mantém valor embaixo de título. */
export const COLUNAS_DA_PREVIA = ["", "Processo", "Tribunal", "Comunicações", "Situação"] as const;

/** Um `BotaoNu` com cara de link, nas medidas do `.link-acao` do desenho:
 * 12,5px/700 na cor da marca, e o escurecido no hover.
 *
 * ⚠️ `BotaoNu`, não `BotaoDeTexto`: aquele é o "← Voltar" das telas de
 * detalhe, um `Button` do Chakra com 9px de padding vertical -- 40px de
 * altura contra os 17px do desenho. O errado era o uso, não ele.
 *
 * ⚠️ Sem sublinhado: ele é a marca do `.link-periodo`, que abre um bloco de
 * campos. Estes três ("Marcar todos", "Desmarcar todos", "Escolher um
 * período") agem sobre o que já está na tela.
 */
export const ESTILO_DE_LINK = {
  color: "fg.brand",
  fontSize: "12.5px",
  fontWeight: 700,
  /* ⚠️ `normal`, não a do corpo: `BotaoNu` herda a `line-height` 1,45 do
     tema e o link fica 18,1px de altura contra os 17px do desenho. Medido
     nos dois lados, com o botão do desenho clonado para o `body` dele --
     escondido ele mede zero, e a comparação passaria por igual. */
  lineHeight: "normal",
  _hover: { color: "brand.dark" },
} as const;

/** O par de cores de cada cartão da fileira da prévia (`.bloco` do desenho).
 *
 * 🔴 A cor é o que separa as três respostas: verde "entra", âmbar "não
 * entra", e azul o RECORTE dos que entram -- nem uma coisa nem outra. O
 * primeiro cartão fica neutro porque ele não responde nada: é o total.
 *
 * ⚠️ Fundo e borda vêm do semáforo do projeto (`status.*`), não dos
 * `bg.warning`/`fg.success` do Chakra: aqueles são laranja e verde da paleta
 * DELE, e o texto sai fora da régua de contraste que `theme/index.ts`
 * documenta -- só as variantes `.text` passam em 4,5:1.
 */
export const TONS_DO_CARTAO_DE_RESUMO = {
  neutro: {},
  bom: { bg: "status.good.bg", borderColor: "status.good", cor: "status.good.text" },
  atencao: { bg: "status.warn.bg", borderColor: "status.warn", cor: "status.warn.text" },
  marca: { bg: "bg.brand.subtle", borderColor: "fg.brand", cor: "brand.darker" },
} as const;

/** A cor de cada estado do achado -- TRÊS cores para quatro estados.
 *
 * 🔴 **A cor separa "não dá" de "dá"**, não graus de impedimento. Âmbar só no
 * que o servidor recusa; os dois do meio dividem o cinza porque os dois dizem
 * "dá, mas saiba disto" -- cores diferentes ali sugeririam que um impede mais
 * que o outro, quando nenhum impede. Verde no que entra sem ressalva.
 */
export const CORES_DA_ETIQUETA_DE_SITUACAO: Record<
  EstadoDoAchado,
  { bg: string; color: string }
> = {
  aqui: { bg: "status.warn.bg", color: "status.warn.text" },
  noutro: { bg: "bg.muted", color: "fg.muted" },
  em_outro: { bg: "bg.muted", color: "fg.muted" },
  /* 🔴 Cor PRÓPRIA, e nenhuma das outras servia:
     - o verde de "novo" apagaria justamente o aviso que a etiqueta existe
       para dar (o processo é novo, e é esse o problema);
     - o cinza é dos dois "está em outro subgrupo", que são fato sobre ONDE o
       processo está -- este é sobre uma DECISÃO que alguém tomou;
     - o âmbar é do único que TRAVA.

     🔴 **Vermelho, escolhido em 30/08/2026 -- e a objeção contra ele CAIU
     junto com a decisão irmã.** Eu havia argumentado que vermelho sugere
     impedimento num estado que continua marcável. Isso valia enquanto o
     processo vinha PRÉ-MARCADO; na mesma conversa ficou decidido que os
     removidos não vêm marcados (ver `preSelecionados`), e aí o vermelho
     passa a dizer exatamente o que a tela faz: o padrão é não trazer de
     volta. As duas decisões se sustentam mutuamente -- mexer numa sem a
     outra devolve a incoerência.

     ⚠️ Contraste MEDIDO, não presumido: `bad.dark` (#b93a44) sobre
     `bad.tint` (#fbe9ea) dá **4,78:1** -- passa AA (4,5), e é o mais
     APERTADO das cinco etiquetas. Escurecer o fundo ou clarear o texto
     reprova; se alguém quiser mexer, mede antes. */
  removido: { bg: "status.bad.bg", color: "status.bad.text" },
  novo: { bg: "status.good.bg", color: "status.good.text" },
};
