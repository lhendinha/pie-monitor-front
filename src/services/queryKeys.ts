/** Chaves de query centralizadas -- evita string solta duplicada e garante
 * que páginas diferentes que pedem o mesmo recurso (ex: subgrupos, pedido
 * tanto em ProcessosPage quanto em MembrosPage/ConvidarPage) compartilhem
 * cache. As chaves aninhadas (ex: membrosDoSubgrupo sob o prefixo "membros")
 * são propositais: invalidar o prefixo mais curto invalida as variações
 * aninhadas também (comportamento do React Query), o que replica o que já
 * acontece hoje -- qualquer refetch de MembrosPage recria os objetos
 * `subgrupo` passados pra cada <SubgrupoMembros>, o que já refaz o fetch de
 * cada um deles por causa da troca de referência nas deps do useCallback. */
export const qk = {
  /** `GET /me` -- o próprio registro.
   *
   * ⚠️ Sem parâmetro: o alvo vem do token, então só existe UMA resposta por
   * sessão. Uma chave com o e-mail dentro daria a impressão de que dá para
   * pedir o de outra pessoa. */
  membroEditavel: (email: string) => ["membro-editavel", email] as const,
  meuPerfil: () => ["meu-perfil"] as const,
  subgrupos: (params: { pagina?: number; tamanhoPagina?: number; busca?: string } = {}) =>
    ["subgrupos", params] as const,
  subgruposDoGrupo: (grupoId: string) => ["subgrupos", "grupo", grupoId] as const,
  conteudoDoSubgrupo: (subgrupoId: string) => ["subgrupos", "conteudo", subgrupoId] as const,
  /** Uma PÁGINA de `GET /grupos/membros` -- a tabela da tela de Membros. */
  membros: (params: Record<string, unknown> = {}) => ["membros", params] as const,
  /** TODAS as pessoas do grupo, para resolver apelido/papel e popular
   * seletores.
   *
   * ⚠️ Chave própria de propósito. Compartilhar `["membros", {}]` com a
   * página 1 da tabela faria dois formatos diferentes ocuparem o mesmo
   * cache -- o mesmo tipo de colisão que já mordeu o carimbo otimista do
   * Kanban sob o prefixo `["tarefas"]`. O prefixo continua o mesmo, então
   * `invalidateQueries({ queryKey: ["membros"] })` derruba os dois. */
  todosOsMembros: () => ["membros", "todos"] as const,
  resumo: () => ["resumo"] as const,
  quadro: (subgrupoId: string) => ["quadro", subgrupoId] as const,
  membrosDoSubgrupo: (subgrupoId: string) => ["membros", "subgrupo", subgrupoId] as const,
  grupos: () => ["grupos"] as const,
  notificacoes: () => ["notificacoes"] as const,
  atendimentos: (
    params: { busca?: string; status?: string; pagina?: number; tamanhoPagina?: number } = {},
  ) => ["atendimentos", params] as const,
  atendimento: (subgrupoId: string, atendimentoId: string) =>
    ["atendimentos", "detalhe", subgrupoId, atendimentoId] as const,
  configuracoesDoGrupo: () => ["configuracoes-do-grupo"] as const,
  tarefas: (params: Record<string, unknown> = {}) => ["tarefas", params] as const,
  tarefasDoProcesso: (numeroProcesso: string) =>
    ["tarefas", "processo", numeroProcesso] as const,
  /** ⚠️ NÃO começa com "tarefas": os `invalidateQueries({ queryKey:
   * ["tarefas"] })` espalhados pelo Kanban derrubariam esta consulta junto,
   * e o modal aberto pelo link piscaria a cada movimento de cartão. */
  tarefa: (subgrupoId: string, tarefaId: string) =>
    ["tarefa", subgrupoId, tarefaId] as const,
  processos: (params: {
    pagina?: number;
    tamanhoPagina?: number;
    busca?: string;
    clienteId?: string;
    faseId?: string;
    situacaoId?: string;
    dataVerificarAte?: string;
    prazoFinalAte?: string;
  }) => ["processos", params] as const,
  /** ⚠️ Todo filtro do Histórico entra AQUI. Filtro fora da chave faz a
   * consulta reusar o resultado do filtro anterior -- lista errada, sem erro
   * nenhum. O tipo é explícito de propósito: acrescentar parâmetro na API e
   * esquecer aqui vira erro de compilação, não bug silencioso. */
  historico: (params: {
    subgrupoId?: string;
    numeroProcesso?: string;
    pagina?: number;
    tamanhoPagina?: number;
    tipoEnvio?: string;
    apenasComFalha?: boolean;
    dias?: number;
  }) => ["historico", params] as const,
  detalhesProcesso: (numeroProcesso: string) => ["detalhesProcesso", numeroProcesso] as const,
  detalheCliente: (clienteId: string) => ["cliente", clienteId] as const,
  clientes: (params: { pagina?: number; tamanhoPagina?: number; busca?: string } = {}) => ["clientes", params] as const,
  opcoesProcesso: (tipo: "fase" | "situacao", params: { pagina?: number; tamanhoPagina?: number } = {}) =>
    ["opcoesProcesso", tipo, params] as const,

  // --- catálogos completos ---------------------------------------------
  //
  // 🔴 Chave PRÓPRIA pra "todas as páginas", separada da chave de uma
  // página. Sem isso, duas funções de busca diferentes dividiam a mesma
  // chave: o React Query deduplica por chave e roda o `queryFn` de quem
  // registra primeiro, então o resultado dependia da ordem de montagem --
  // e `CamposProcesso`, que monta DENTRO da ProcessosPage, sobrescrevia o
  // catálogo completo com a versão truncada em 100.
  //
  // O prefixo continua o mesmo (`["clientes"]`, `["subgrupos"]`,
  // `["opcoesProcesso", tipo]`), então invalidar por prefixo derruba os dois.
  //
  // ⚠️ Invalidar tem que usar o PREFIXO, não a chave de página. `qk.clientes()`
  // é `["clientes", {}]`, e o `partialMatchKey` do React Query compara o
  // terceiro elemento: `{}` casa com `{pagina:1}` (objeto contra objeto), mas
  // NÃO casa com a string `"todos"`. Por isso os prefixos abaixo.
  prefixoClientes: () => ["clientes"] as const,
  prefixoSubgrupos: () => ["subgrupos"] as const,
  prefixoOpcoesProcesso: (tipo: "fase" | "situacao") => ["opcoesProcesso", tipo] as const,

  prefixoAtendimentos: () => ["atendimentos"] as const,
  /** TODOS os processos de um cliente -- chave separada da paginada, pelo
   * mesmo motivo dos outros catálogos: duas funções de busca numa chave só
   * fazem o cache depender da ordem de montagem. */
  todosOsProcessosDoCliente: (clienteId: string) =>
    ["processos", "doCliente", clienteId] as const,
  /** Resumos dos atendimentos que UMA TELA referencia.
   *
   * A chave carrega os pares porque telas diferentes (períodos diferentes da
   * Agenda) pedem conjuntos diferentes -- e compartilhar chave entre
   * conjuntos faria uma sobrescrever a outra. Quem monta a lista ordena
   * antes, senão a mesma tela em outra ordem vira outra entrada no cache. */
  resumosDeAtendimentos: (pares: string[]) => ["atendimentos", "resumos", pares] as const,

  /** Uma PÁGINA de documentos -- a tela geral e as abas dentro de processo,
   * cliente e atendimento. Todo filtro entra na chave: filtro fora dela faz
   * a consulta reusar o resultado do filtro anterior, o que na aba de um
   * processo mostraria os documentos de outro. */
  documentos: (
    params: {
      busca?: string;
      processoNumero?: string;
      atendimentoId?: string;
      clienteId?: string;
      pagina?: number;
      tamanhoPagina?: number;
    } = {},
  ) => ["documentos", params] as const,
  documento: (subgrupoId: string, documentoId: string) =>
    ["documentos", "detalhe", subgrupoId, documentoId] as const,

  todosOsSubgrupos: () => ["subgrupos", "todos"] as const,
  todasAsOpcoes: (tipo: "fase" | "situacao") => ["opcoesProcesso", tipo, "todos"] as const,
};
