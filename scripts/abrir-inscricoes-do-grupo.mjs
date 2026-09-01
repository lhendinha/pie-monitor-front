/** Abre a aba "Inscrições na OAB" em Chrome, para olhar com a lista cheia.
 *
 *   1) cd ../api && yarn offline
 *   2) semeie a lista (ver `api/scripts/semear_inscricoes_avulsas.py`)
 *   3) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   4) node scripts/abrir-inscricoes-do-grupo.mjs
 *
 * ⚠️ Não é teste: não afirma nada e não devolve código de saída de falha. É a
 * janela aberta para olhar, que é o que `verificar-inscricoes-do-grupo.mjs`
 * não faz -- aquele fecha o navegador ao terminar.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

const navegador = await chromium.launch({ channel: "chrome", headless: false });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1500, height: 1000 } })
).newPage();

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();

await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
await pagina.getByText("Inscrições da OAB").waitFor();

const linhas = await pagina.locator("tbody tr").count();
const ligadas = await pagina.getByText("Ligada", { exact: true }).count();
const contador = await pagina.locator("text=/^\\d+ de \\d+$/").first().textContent();
const temBarra = await pagina
  .getByText("Por página")
  .isVisible()
  .catch(() => false);
console.log(`contador "${contador}" | ${linhas} linhas na página | ${ligadas} ligadas`);
console.log(`barra de paginação: ${temBarra ? "visível" : "escondida"}`);

await pagina.screenshot({ path: "/tmp/insc-20.png" });
console.log("captura em /tmp/insc-20.png -- a janela fica aberta");
