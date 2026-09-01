/** Abre a aba Membros em Chrome, com a lista cheia, e DEIXA ABERTO.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_inscricoes_avulsas.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/abrir-etiquetas-de-subgrupo.mjs
 *
 * ⚠️ Não é teste: não afirma nada e não fecha o navegador. Quem afirma é
 * `verificar-etiquetas-de-subgrupo.mjs`. Este é a janela para olhar.
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
await pagina.getByRole("tab", { name: "Membros" }).click();
await pagina.getByText("Ângela Dez Subgrupos").waitFor();

console.log("Chrome aberto na aba Membros.");
console.log("  Ângela Dez Subgrupos -> 10 subgrupos (a contagem)");
console.log("  Duas Nomes Costa     -> os dois nomes");
console.log("  Uma Só Silva         -> um nome");
console.log("  Vitória Sem Subgrupo -> o travessão");
console.log('Na aba "Inscrições na OAB": 20 inscrições, com destinos de 1, 2 e 5.');
console.log("\nA janela fica aberta. Feche o Chrome quando terminar.");
