import { chamar } from "./client";

/** `GET /notificacoes` -- as minhas, mais recentes primeiro, com a contagem
 * de não lidas pro badge.
 *
 * Sem paginação de propósito: o sino é uma janela do que é recente, não um
 * arquivo pra navegar. Quem quer o histórico completo tem a tela de
 * Histórico, que é outra coisa. */
export function listarNotificacoes() {
  return chamar("/notificacoes");
}

/** O `usuario_id` faz parte da chave no servidor, então a notificação de
 * outra pessoa simplesmente não é encontrada -- 404, não um 200 que não
 * fez nada. */
export function marcarNotificacaoLida(notificacaoId: string) {
  return chamar(`/notificacoes/${encodeURIComponent(notificacaoId)}/lida`, { method: "PATCH" });
}

export function marcarTodasLidas() {
  return chamar("/notificacoes/marcar-todas-lidas", { method: "POST" });
}
