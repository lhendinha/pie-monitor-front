import { useEffect } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

import {
  INTERVALO_DO_PING_MS,
  MARGEM_DO_TOKEN_SEGUNDOS,
  RECONEXAO_DO_CANAL,
} from "../constants";
import { getAccessToken, renovarToken, tokenVenceEm } from "../services/auth";
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
 */
export function useCanalDeNotificacoes(aoChegar: () => void) {
  useEffect(() => {
    const base = import.meta.env.VITE_WS_URL as string | undefined;
    // Sem URL configurada (ambiente de teste, preview antigo) ou sem sessão,
    // simplesmente não abre. O sino segue funcionando pela consulta.
    if (!base || !getAccessToken()) return;

    /** A URL é montada A CADA TENTATIVA, não uma vez.
     *
     * 🔴 Era a limitação conhecida do canal: o token era lido na abertura e
     * ficava congelado. Quando vencia (dura 24h), a reconexão seguinte
     * levava o token morto, tomava 401, e o canal desistia -- a pessoa
     * perdia o tempo real até dar F5, sem nada na tela dizendo isso.
     *
     * Aqui ele é lido na hora e RENOVADO se estiver perto de vencer. Como
     * uma conexão vive no máximo 2h (teto do API Gateway), toda reconexão
     * passa por este caminho e o canal se recupera sozinho.
     */
    async function urlComTokenAtual(): Promise<string> {
      if (tokenVenceEm(MARGEM_DO_TOKEN_SEGUNDOS)) {
        // Se a renovação falhar, segue com o que há: quem decide é o
        // handshake. Insistir aqui atrasaria a reconexão sem melhorar nada.
        await renovarToken().catch(() => false);
      }
      return `${base}?token=${encodeURIComponent(getAccessToken() ?? "")}`;
    }

    const socket = new ReconnectingWebSocket(urlComTokenAtual, [], RECONEXAO_DO_CANAL);

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
