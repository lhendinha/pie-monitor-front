/** As variáveis de ambiente do Vite, num lugar só.
 *
 * 🔴 `VITE_API_URL` era lida em DOIS arquivos (`services/auth.ts` e
 * `services/api/client.ts`), cada um com o próprio `as string | undefined`.
 * Duas leituras da mesma variável é uma a mais do que precisa existir: o
 * dia em que uma ganhasse tratamento (fallback, normalização de barra
 * final) a outra ficaria para trás em silêncio.
 *
 * ⚠️ `import.meta.env` **não existe** fora do Vite, e este é o único
 * arquivo do `src/` que o menciona. Um `grep` que ache outro é regressão.
 */

/** A URL da API. `undefined` quando não configurada -- quem consome avisa. */
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** Modo de desenvolvimento.
 *
 * ⚠️ Passar por esta constante NÃO estraga a eliminação de código morto:
 * medido: com o devtools atrás dela, o bundle saiu byte a byte idêntico
 * (1.190.863 B) e `react-query-devtools` continuou fora de todo chunk. O
 * Rollup dobra a constante porque o Vite substitui `import.meta.env.DEV`
 * por um literal antes.
 */
export const EM_DESENVOLVIMENTO = import.meta.env.DEV;

/** A URL do canal WebSocket -- **função**, não constante.
 *
 * Ela é lida na hora de CONECTAR, dentro do efeito, e não no carregamento
 * do módulo. Virar constante mudaria esse momento, e é dele que dependem
 * tanto o hook (que remonta a URL a cada tentativa) quanto os testes, que
 * variam a variável por caso com `vi.stubEnv`.
 */
export function urlDoCanal(): string | undefined {
  return import.meta.env.VITE_WS_URL as string | undefined;
}
