/** As duas abas da tela.
 *
 * 🔴 **Esta tela não tinha abas** -- era a linha do tempo direto, e as duas
 * irmãs (processo e cliente) já tinham. Documentos entrou como aba nas três,
 * e uma tela de detalhe sem abas ao lado de duas com abas faria o mesmo
 * conteúdo ser procurado em dois lugares diferentes.
 *
 * A primeira é o padrão, e é o que a tela sempre foi: a conversa registrada.
 *
 * ⚠️ O nome do parâmetro na URL (`?aba=`) e o `abaValida` que o lê são
 * compartilhados -- ver `utils/abas`. Aqui fica só o que é desta tela.
 */
export const ABAS_DO_ATENDIMENTO = [
  { id: "registros", rotulo: "Registros" },
  { id: "documentos", rotulo: "Documentos" },
] as const;

/** O prefixo dos ids de acessibilidade que ligam cada aba ao seu painel.
 *
 * Existe porque duas listas de abas podem coexistir numa página -- ver
 * `utils/abas`. */
export const GRUPO_DE_ABAS = "atendimento";
