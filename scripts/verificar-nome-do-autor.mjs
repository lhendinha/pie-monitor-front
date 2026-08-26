/** O nome de quem agiu vem do servidor -- conferido em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-nome-do-autor.mjs
 *
 * 🔴 O que este script prova não é só que o nome aparece: é que
 * `/grupos/membros` **deixou de ser pedido**. Aquela requisição era o defeito
 * -- baixava o escritório inteiro pra traduzir e-mail em apelido, e só rodava
 * pra `manager` pra cima, então quem é `user` via e-mail cru pra sempre.
 *
 * Um teste que só olhasse o nome na tela passaria com a requisição ainda
 * acontecendo. Por isso a asserção principal aqui é uma AUSÊNCIA.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

/* 🔴 Semeia o que vai conferir, em vez de contar com estado deixado por
   alguém. A primeira versão dependia de uma notificação semeada à mão: um
   `yarn offline:limpar` no meio derrubava a verificação, e o sintoma
   (nenhuma notificação na tela) parecia defeito do código. */
const { stdout } = await promisify(execFile)(
  "../api/.venv/bin/python",
  ["scripts/offline/semear_notificacao_com_autor.py"],
  { cwd: "../api" },
);
const APELIDO = stdout.trim();

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 40 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const pedidos = [];
const erros = [];
pagina.on("request", (r) => pedidos.push(new URL(r.url()).pathname));
pagina.on("response", (r) => {
  if (r.status() >= 400) erros.push(`${r.status()} ${new URL(r.url()).pathname}`);
});
pagina.on("pageerror", (e) => erros.push(e.message.slice(0, 120)));

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");
console.log("1/4  entrou");

await pagina.getByRole("button", { name: "Notificações" }).click();
const frase = await pagina.getByText(/atribuiu uma tarefa a você/).first().textContent();
console.log(`2/4  sino diz: "${frase.trim()}"`);
if (!frase.includes(APELIDO)) {
  console.error(`     ✗ esperava "${APELIDO}" na frase, veio outra coisa`);
  await navegador.close();
  process.exit(1);
}

await pagina.keyboard.press("Escape");
await pagina.goto(`${APP}/atendimentos`);
await pagina.waitForLoadState("networkidle");
const temAtendimento = await pagina.getByText(/Revisão de contrato/).count();
console.log(`3/4  Atendimentos abriu (${temAtendimento} linha visível)`);

const baixouMembros = pedidos.filter((p) => p.includes("/grupos/membros"));
console.log(
  baixouMembros.length
    ? `4/4  ✗ ainda pediu /grupos/membros ${baixouMembros.length}x`
    : "4/4  /grupos/membros NÃO foi pedido nenhuma vez",
);

if (erros.length) console.log(`     respostas >= 400 / erros: ${erros.join(" | ")}`);
await navegador.close();
process.exit(baixouMembros.length || erros.length ? 1 : 0);
