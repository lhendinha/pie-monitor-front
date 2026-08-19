// ultima_verificacao muda por um job no backend, sem ação de usuário -- e
// um apelido editado por outra pessoa também só apareceria aqui ao trocar
// de aba/foco. Revalida sozinho enquanto a aba estiver aberta e em foco (o
// React Query já pausa o polling em background por padrão).
export const INTERVALO_POLLING_PROCESSOS_MS = 60_000;
