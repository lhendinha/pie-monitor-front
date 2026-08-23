/** O canal de tempo real do sino (WebSocket).
 *
 * Aqui, e não no hook: são números que descrevem o CONTRATO com o API
 * Gateway, não detalhe de implementação de quem consome.
 */

/** ⚠️ O API Gateway derruba a conexão depois de 10 MINUTOS sem tráfego. O
 * ping é o que a segura -- sem ele, quem deixa o sistema aberto lendo um
 * processo perde o canal em silêncio, sem nada na tela indicando.
 *
 * Cinco minutos dá duas chances antes do corte: se um ping se perder, o
 * seguinte ainda chega a tempo.
 *
 * ⚠️ Mexer aqui mexe na CAPACIDADE do canal: o ping domina o tráfego em
 * regime, e o throttling do gateway é de 5 req/s. De 5 pra 1 minuto, a
 * capacidade divide por cinco. */
export const INTERVALO_DO_PING_MS = 5 * 60 * 1000;

/** Reconexão com espera crescente e jitter.
 *
 * O jitter importa: numa queda de rede do escritório inteiro, todo mundo
 * reconecta junto e bateria no throttling do gateway. Espalhado, cada um
 * entra na sua vez. */
export const RECONEXAO_DO_CANAL = {
  minReconnectionDelay: 1000,
  maxReconnectionDelay: 30000,
  reconnectionDelayGrowFactor: 1.5,
  /** ⚠️ Teto de tentativas, e o motivo não é rede -- é TOKEN.
   *
   * O navegador não expõe o status do handshake que falhou (por segurança),
   * então o cliente não distingue "wi-fi caiu" de "401, token expirado". Sem
   * teto, um token vencido faria o canal tentar pra sempre: cada tentativa é
   * um handshake recusado, que ainda invoca Lambda.
   *
   * Vinte tentativas com espera crescente cobrem uns 8 minutos -- folgado
   * pra queda de rede, e curto pra parar de martelar quando o problema é
   * credencial. */
  maxRetries: 20,
};

/** Margem pra considerar o token "velho demais" antes de abrir o canal.
 *
 * Uma conexão de WebSocket vive até 2h (teto do API Gateway), então abrir
 * com um token que vence em cinco minutos garante uma reconexão logo
 * adiante. Renovando antes, a conexão nasce com validade de sobra. */
export const MARGEM_DO_TOKEN_SEGUNDOS = 10 * 60;
