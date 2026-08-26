/** Fluxo completo, sem stub nenhum: front real contra API real.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-sessao.mjs
 *
 * A pessoa está no Escritório Alfa, é MOVIDA pro Beta por um super_admin, e a
 * tela dela tem que se corrigir sozinha -- sem digitar senha, sem F5.
 *
 * 🔴 Nenhum stub alcança isto. O que está sendo exercitado é a costura entre
 * os dois lados: `contexto_jwt_base` recusa o token velho (401), o front
 * renova sozinho, `emitir_tokens` relê o banco e devolve o grupo novo, e o
 * cache do React Query é resetado pra a tela não seguir mostrando o
 * escritório anterior.
 *
 * Medido com e sem a verificação, em Chrome:
 *
 *              grupo no navegador   escritório antigo   escritório novo
 *   sem ela    g-alfa               APARECE             não
 *   com ela    g-beta               não                 aparece
 *
 * ⚠️ Os erros no console são ESPERADOS, e vale saber quais:
 *   - os `401` em `/subgrupos`, `/fases`, `/processos` são o token velho sendo
 *     recusado -- é o mecanismo funcionando, não falha;
 *   - o `404` de `/favicon.ico` é do dev server do Vite;
 *   - ⚠️ os de WebSocket eram o front tentando o endereço de PRODUÇÃO, porque
 *     o arranjo antigo (`../api/scripts/api_local.py`) não subia o canal.
 *     Com o `yarn offline` ele sobe: passando `VITE_WS_URL=ws://localhost:8098`
 *     esses erros deixam de aparecer. Sem passar, voltam -- e aí são o front
 *     falando com produção a partir de uma tela local.
 *
 * ⚠️ O que continua descoberto é **IAM** -- nada local aplica política, e é
 * exatamente esse o furo que já derrubou produção. Quem guarda essa porta é
 * `api/tests/test_iam_cobre_o_codigo.py`, por leitura estática. */
import { chromium } from "playwright";

const API = "http://localhost:8099";
const n = await chromium.launch({ channel: "chrome", headless: false, slowMo: 45 });
const p = await (await n.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message.slice(0, 130)));
p.on("response", (r) => { if (r.status() >= 400) erros.push(`${r.status()} ${new URL(r.url()).pathname}`); });
p.on("console", (m) => m.type() === "error" && !m.text().includes("WebSocket") && erros.push(m.text().slice(0, 130)));

async function api(caminho, opts = {}) {
  const r = await fetch(`${API}${caminho}`, opts);
  return r.json();
}

// 1) entra de verdade
await p.goto("http://localhost:5174/login", { waitUntil: "networkidle" });
await p.getByLabel(/E-mail/i).fill("movida@local.test");
await p.getByLabel(/Senha/i).first().fill("Senha!Local1");
await p.getByRole("button", { name: /Entrar/i }).click();
await p.waitForTimeout(3000);
console.log(`  1) entrou: ${p.url().includes("/login") ? "🔴 não" : "ok"}`);

await p.getByRole("link", { name: /Clientes/i }).first().click();
await p.waitForTimeout(2000);
const viuAlfa = (await p.getByText("CLIENTE DO ALFA").count()) > 0;
console.log(`  2) vê o escritório ALFA: ${viuAlfa ? "ok" : "🔴"}`);
console.log(`     grupo no navegador: ${await p.evaluate(() => localStorage.getItem("pje-monitor-grupo-id"))}`);

// 3) fora da tela dela, o super_admin a move
const chefe = await api("/login", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "chefe@local.test", password: "Senha!Local1" }) });
await fetch(`${API}/grupos/membros/movida@local.test`, { method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${chefe.access_token}` },
  body: JSON.stringify({ apelido: "Movida", grupo_id: "g-beta", subgrupos: ["sub-g-beta"] }) });
console.log("  3) super_admin moveu ela para o BETA (por fora da tela)");

// 4) ela só navega -- não recarrega, não faz login de novo
await p.getByRole("link", { name: /Processos/i }).first().click();
await p.waitForTimeout(1500);
await p.getByRole("link", { name: /Clientes/i }).first().click();
await p.waitForTimeout(3500);

const aindaAlfa = (await p.getByText("CLIENTE DO ALFA").count()) > 0;
const agoraBeta = (await p.getByText("CLIENTE DO BETA").count()) > 0;
console.log(`  4) depois de só NAVEGAR:`);
console.log(`     grupo no navegador: ${await p.evaluate(() => localStorage.getItem("pje-monitor-grupo-id"))}`);
console.log(`     mostra o ALFA (escritório antigo): ${aindaAlfa ? "🔴 SIM" : "não"}`);
console.log(`     mostra o BETA (escritório novo):   ${agoraBeta ? "ok" : "🔴 não"}`);
console.log(`     continua logada: ${p.url().includes("/login") ? "🔴 foi deslogada" : "ok"}`);
console.log(`  5) ${erros.length ? "ERROS: " + [...new Set(erros)].join(" | ") : "sem erros no console"}`);
await p.waitForTimeout(1500);
await n.close();
