export interface DeepLinkHistorico {
  processo: string;
  comunicacaoId: string;
}

/** Só conta como deep link de Histórico se os DOIS parâmetros vierem. O
 * e-mail de movimentação manda os dois juntos (check_service.py). */
export function parseDeepLinkHistorico(search: string): DeepLinkHistorico | null {
  const params = new URLSearchParams(search);
  const processo = params.get("processo");
  const comunicacao = params.get("comunicacao");
  return processo && comunicacao ? { processo, comunicacaoId: comunicacao } : null;
}

/** Número de processo vindo de `?processo=` SEM `?comunicacao=`.
 *
 * O backend gera esse link como defensivo, quando a API do PJe não devolve
 * o `id` da comunicação -- o comentário lá diz que assim "degrada pro link
 * antigo em vez de quebrar o e-mail". Só que `parseDeepLinkHistorico` exige
 * os dois e devolve `null`: até esta função existir, a pessoa clicava, o app
 * abria na tela inicial e nada acontecia. A degradação graciosa degradava
 * pra nada.
 *
 * Devolve `null` quando o link está completo, porque aí quem manda é o
 * `parseDeepLinkHistorico` -- os dois nunca disputam o mesmo link.
 */
export function parseProcessoAvulso(search: string): string | null {
  const params = new URLSearchParams(search);
  const processo = params.get("processo");
  if (!processo) return null;
  return params.get("comunicacao") ? null : processo;
}
