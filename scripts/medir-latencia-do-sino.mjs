/** Fase 0 do `api/PLANO_SINO_COM_ALVOS_VIVOS.md`: quanto `GET /notificacoes`
 * leva HOJE, medido pelo cliente -- a linha de base antes de o sino conferir
 * os alvos.
 *
 *   node scripts/medir-latencia-do-sino.mjs
 *
 * 🔴 **Pelo cliente, e não pelo CloudWatch.** A métrica de duração é da lambda
 * `api` inteira, com todas as rotas misturadas, e a API não registra tempo por
 * rota -- não haveria como separar o sino do resto.
 *
 * ⚠️ **Zero tentativa de login**: a sessão vem de `abrirProducaoLogado`. O site
 * da Vercel é aberto UMA vez; as chamadas vão direto à URL da lambda, com o
 * token que a própria tela guardou. Um laço contra a Vercel dispara o
 * Security Checkpoint dela.
 *
 * ⚠️ Espaçadas, e param no primeiro 401: medir não pode virar sondagem, e
 * insistir com token vencido não mede nada.
 */
import { abrirProducaoLogado } from "./sessaoDeProducao.mjs";

const API = "https://6onytielawp7g5fniczhomhhta0qlszl.lambda-url.sa-east-1.on.aws";
const CHAMADAS = 10;
const ESPACO_MS = 30_000;

const { navegador, pagina } = await abrirProducaoLogado();
const medidas = [];
for (let i = 0; i < CHAMADAS; i += 1) {
  const medida = await pagina.evaluate(async (api) => {
    const token = localStorage.getItem("pje-monitor-access-token");
    const inicio = performance.now();
    const resposta = await fetch(`${api}/notificacoes`, { headers: { Authorization: `Bearer ${token}` } });
    const corpo = await resposta.json().catch(() => ({}));
    return { status: resposta.status, ms: Math.round(performance.now() - inicio), linhas: (corpo.notificacoes ?? []).length };
  }, API);
  medidas.push(medida);
  console.log(`chamada ${i + 1}: HTTP ${medida.status} | ${medida.ms} ms | ${medida.linhas} linhas`);
  if (medida.status === 401) {
    console.log("401: a sessão venceu no meio da medição -- parando.");
    break;
  }
  if (i < CHAMADAS - 1) await pagina.waitForTimeout(ESPACO_MS);
}
await navegador.close();

const validas = medidas.filter((m) => m.status === 200).map((m) => m.ms).sort((a, b) => a - b);
const quantil = (lista, q) => lista[Math.min(lista.length - 1, Math.ceil(q * lista.length) - 1)];
if (validas.length) {
  console.log(`\n${validas.length} chamadas com 200 | mínimo ${validas[0]} ms | p50 ${quantil(validas, 0.5)} ms | ` +
    `p90 ${quantil(validas, 0.9)} ms | máximo ${validas[validas.length - 1]} ms`);
} else {
  console.log("\nNenhuma chamada com 200 -- nada a concluir.");
}
