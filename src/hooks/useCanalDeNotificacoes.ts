import { useEffect } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

import { INTERVALO_DO_PING_MS, RECONEXAO_DO_CANAL } from "../constants";
import { getAccessToken } from "../services/auth";
import type { MensagemDoCanal } from "../types";

/** Abre o canal de tempo real e chama `aoChegar` a cada notificação nova.
 *
 * ⚠️ O canal NÃO é fonte da verdade: ele antecipa o que o `GET
 * /notificacoes` já entregaria. Se o push falhar, se a rede cair, se o
 * navegador bloquear o WebSocket -- a lista continua correta na próxima
 * consulta. Por isso nada aqui trata erro de conexão como problema visível
 * pra pessoa: o pior caso é o sino atualizar um pouco depois.
 *
 * ⚠️ O token vai na QUERY STRING porque o navegador não deixa mandar
 * header no handshake de WebSocket -- não existe `Authorization` ali.
 *
 * 🔴 LIMITAÇÃO CONHECIDA: o token é lido UMA VEZ, na abertura. Se ele
 * expirar com a aba aberta (dura 24h, e uma jornada tem 8), o canal cai e
 * não volta sozinho -- as tentativas se esgotam em `maxRetries` e param.
 * O sino continua correto pela consulta, que renova o token no 401; o que
 * se perde é o tempo real, até um F5. Tratar isso exigiria reabrir a
 * conexão a cada renovação de token, e não vale a complexidade enquanto a
 * janela for de 24h.
 */
export function useCanalDeNotificacoes(aoChegar: () => void) {
  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string | undefined;
    const token = getAccessToken();
    // Sem URL configurada (ambiente de teste, preview antigo) ou sem sessão,
    // simplesmente não abre. O sino segue funcionando pela consulta.
    if (!url || !token) return;

    const socket = new ReconnectingWebSocket(
      `${url}?token=${encodeURIComponent(token)}`,
      [],
      RECONEXAO_DO_CANAL,
    );

    const pulsar = setInterval(() => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ acao: "ping" }));
    }, INTERVALO_DO_PING_MS);

    socket.addEventListener("message", (evento) => {
      try {
        const corpo = JSON.parse(evento.data) as MensagemDoCanal;
        if (corpo.tipo === "notificacao") aoChegar();
      } catch {
        /* Mensagem que não é JSON não deveria acontecer, mas derrubar o
           canal por causa dela seria pior que ignorá-la. */
      }
    });

    return () => {
      clearInterval(pulsar);
      socket.close();
    };
    // `aoChegar` fica FORA das dependências de propósito: ela é recriada a
    // cada render de quem chama, e incluí-la reabriria a conexão sem parar.
    // Quem chama passa uma função estável (`useCallback`) quando precisa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
