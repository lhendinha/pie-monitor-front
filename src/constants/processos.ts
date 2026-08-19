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
