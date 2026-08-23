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
  subgrupos: (params: { pagina?: number; tamanhoPagina?: number } = {}) => ["subgrupos", params] as const,
  subgruposDoGrupo: (grupoId: string) => ["subgrupos", "grupo", grupoId] as const,
  conteudoDoSubgrupo: (subgrupoId: string) => ["subgrupos", "conteudo", subgrupoId] as const,
  membros: () => ["membros"] as const,
  resumo: () => ["resumo"] as const,
  quadro: (subgrupoId: string) => ["quadro", subgrupoId] as const,
  membrosDoSubgrupo: (subgrupoId: string) => ["membros", "subgrupo", subgrupoId] as const,
  grupos: () => ["grupos"] as const,
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
  historico: (params: { pagina?: number; tamanhoPagina?: number; tipoEnvio?: string }) =>
    ["historico", params] as const,
  detalhesProcesso: (numeroProcesso: string) => ["detalhesProcesso", numeroProcesso] as const,
  detalheCliente: (clienteId: string) => ["cliente", clienteId] as const,
  clientes: (params: { pagina?: number; tamanhoPagina?: number; busca?: string } = {}) => ["clientes", params] as const,
  opcoesProcesso: (tipo: "fase" | "situacao", params: { pagina?: number; tamanhoPagina?: number } = {}) =>
    ["opcoesProcesso", tipo, params] as const,
};
