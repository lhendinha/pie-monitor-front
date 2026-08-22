import type { FiltrosEstruturadosProcessos } from "../types";

// ultima_verificacao muda por um job no backend, sem ação de usuário -- e
// um apelido editado por outra pessoa também só apareceria aqui ao trocar
// de aba/foco. Revalida sozinho enquanto a aba estiver aberta e em foco (o
// React Query já pausa o polling em background por padrão).
export const INTERVALO_POLLING_PROCESSOS_MS = 60_000;

export const FILTROS_PROCESSOS_VAZIOS: FiltrosEstruturadosProcessos = {
  clienteId: "", faseId: "", situacaoId: "", dataVerificarAte: "", prazoFinalAte: "",
};

export const LABEL_FILTRO_PROCESSOS: Record<keyof FiltrosEstruturadosProcessos, string> = {
  clienteId: "Cliente",
  faseId: "Fase",
  situacaoId: "Situação",
  dataVerificarAte: "Verificar até",
  prazoFinalAte: "Prazo até",
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
] as const;
