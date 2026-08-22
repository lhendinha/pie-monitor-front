/** Abre um painel e fotografa, no artifact e no app, pra comparar.
 *
 * A API é stubada (`stubsDaApi.mjs`), então não precisa de token nem de
 * backend no ar -- e o dado é sempre o mesmo, que é o que uma comparação
 * pixel a pixel exige.
 *
 *   ARTIFACT=... node scripts/comparar-painel.mjs situacao
 *   ARTIFACT=... node scripts/comparar-painel.mjs datas
 */
import { chromium } from "playwright";

import { fingirSessao, instalarStubs } from "./stubsDaApi.mjs";

const qual = process.argv[2] || "situacao";
const b = await chromium.launch();

const GATILHO_ARTIFACT = {
  situacao: "#proc-situacao-filter",
  datas: "#proc-datas-filter",
  cliente: "#proc-cliente-filter",
};
const PAINEL_ARTIFACT = {
  situacao: "#proc-situacao-panel",
  datas: "#proc-datas-panel",
  cliente: "#proc-cliente-panel",
};
/** Os painéis de opção são portais do react-select e se marcam com
 * `data-camada-flutuante`; o de datas é um Popover do Chakra. */
const PAINEL_APP = {
  situacao: "[data-camada-flutuante]",
  datas: "[data-scope='popover'][data-part='content']",
  cliente: "[data-camada-flutuante]",
};
const TEXTO_APP = {
  situacao: "TODAS AS SITUAÇÕES",
  datas: "DATAS",
  cliente: "TODOS OS CLIENTES",
};

// ---- artifact ----
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await c.newPage();
  await p.goto("file://" + process.env.ARTIFACT, { waitUntil: "networkidle" });
  await p.evaluate(() => window.goTo && window.goTo("processos"));
  await p.waitForTimeout(400);
  await p.click(GATILHO_ARTIFACT[qual]);
  await p.waitForTimeout(400);
  await p.locator(PAINEL_ARTIFACT[qual]).screenshot({ path: `/tmp/painel-${qual}-artifact.png` });
  await c.close();
}

// ---- app ----
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await fingirSessao(c);
  await instalarStubs(c);
  const p = await c.newPage();
  await p.goto("http://localhost:5173/processos", { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.getByText(TEXTO_APP[qual], { exact: false }).first().click();
  await p.waitForTimeout(500);
  await p.locator(PAINEL_APP[qual]).first().screenshot({ path: `/tmp/painel-${qual}-app.png` });
  await c.close();
}

console.log(`  /tmp/painel-${qual}-artifact.png e /tmp/painel-${qual}-app.png`);
await b.close();
