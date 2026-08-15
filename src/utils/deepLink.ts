export interface DeepLinkHistorico {
  processo: string;
  comunicacaoId: string;
}

/** Lê ?processo= + ?comunicacao= da query string -- só conta como deep
 * link de Histórico se os DOIS parâmetros estiverem presentes (o e-mail
 * de notificação manda os dois juntos; ver check_service.py::_notificar). */
export function parseDeepLinkHistorico(search: string): DeepLinkHistorico | null {
  const params = new URLSearchParams(search);
  const processo = params.get("processo");
  const comunicacao = params.get("comunicacao");
  return processo && comunicacao ? { processo, comunicacaoId: comunicacao } : null;
}
