/** A Agenda parou de pedir quadro -- e por isso deixou de mentir acima de 50.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_muitos_subgrupos.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-agenda-sem-quadros.mjs
 *
 * 🔴 Cenário que PRODUÇÃO NÃO MOSTRARIA: 55 subgrupos, um por escritório de
 * verdade seria 8. A Agenda pedia um quadro por subgrupo exibido, mas a lista
 * de subgrupos vinha da primeira página -- 50. A tarefa concluída do 51º
 * chegava sem `coluna_nome` e sem tachado: **concluída exibida como
 * pendente**, em silêncio.
 *
 * Duas asserções, e a segunda é uma AUSÊNCIA:
 *   - toda tarefa concluída aparece riscada, inclusive as de além do 50º;
 *   - `/quadro` não é pedido nenhuma vez.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

const pedidos = [];
pagina.on("request", (r) => pedidos.push(new URL(r.url()).pathname));

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");
console.log("1/4  entrou");

await pagina.goto(`${APP}/agenda`);
await pagina.getByRole("heading", { name: "Agenda" }).waitFor();
/* ⚠️ Zera DEPOIS de chegar na Agenda. A primeira versão contava desde o
   login e acusava 2 pedidos de `/quadro` que eram da tela de entrada, não
   desta -- acusação no alvo errado. */
pedidos.length = 0;

/* A Agenda abre "Por mês", que é uma grade de contagens: os títulos das
   tarefas não estão na tela. O tachado se vê na visão por DIA. */
/* A visão é uma PÍLULA que abre um menu -- dois cliques, como no teste de
   unidade (`pilulaDeVisao` + a opção). */
await pagina.getByRole("button", { name: /Por mês|Por semana|Por dia|Em lista/ }).first().click();
await pagina.getByRole("button", { name: /^Em lista$/ }).click();
await pagina.waitForLoadState("networkidle");
console.log("2/4  Agenda carregou, visão em lista");

/* Conta quantas tarefas da semeadura estão riscadas. O tachado é estilo, não
   texto -- por isso a leitura é do `text-decoration` computado. */
const resultado = await pagina.evaluate(() => {
  const alvos = [...document.querySelectorAll("*")].filter(
    (e) => e.children.length === 0 && /^Pronta na area \d{3}$/.test(e.textContent?.trim() ?? ""),
  );
  const riscadas = alvos.filter((e) =>
    getComputedStyle(e).textDecorationLine.includes("line-through"),
  );
  return {
    total: alvos.length,
    riscadas: riscadas.length,
    naoRiscadas: alvos
      .filter((e) => !getComputedStyle(e).textDecorationLine.includes("line-through"))
      .map((e) => e.textContent.trim())
      .slice(0, 5),
  };
});
console.log(`3/4  tarefas visíveis: ${resultado.total} · riscadas: ${resultado.riscadas}`);
if (resultado.naoRiscadas.length) {
  console.log(`     ✗ concluídas SEM tachado: ${resultado.naoRiscadas.join(", ")}`);
}

const pediuQuadro = pedidos.filter((p) => p.includes("/quadro"));
console.log(
  pediuQuadro.length
    ? `4/4  ✗ pediu /quadro ${pediuQuadro.length}x`
    : "4/4  /quadro NÃO foi pedido nenhuma vez",
);

await navegador.close();
const ok = resultado.total > 50 && resultado.naoRiscadas.length === 0 && pediuQuadro.length === 0;
process.exit(ok ? 0 : 1);
