/** A aba Membros de /grupo -- em Chrome de verdade, lida do índice por grupo.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-membros.mjs
 *
 * 🔴 **O que só o Chrome responde**: a lista que a PESSOA vê, com todo mundo
 * do grupo e em ordem de apelido, depois que a API deixou de varrer a tabela
 * de usuários inteira e passou a ler o `GrupoOrdemIndex`. Índice esparso
 * esconde item sem a chave SEM erro -- a suíte prova a rota; aqui a pergunta
 * é se ninguém sumiu da tela.
 *
 * ⚠️ As quatro contas vêm de `banco.py` (chefe, movida) e `semear_papeis.py`
 * (user, gerente): o apelido é a parte local do e-mail, e a ordem esperada
 * é a alfabética delas -- que NÃO é a ordem de criação.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
const ESPERADO = ["chefe", "gerente", "movida", "user"];

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome, detalhe });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login")) problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor({ timeout: 30_000 });
console.log("entrou\n");

await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Membros" }).click();
await pagina.getByText("user@local.test").waitFor({ timeout: 20_000 });

/** Os e-mails do grupo, na ordem em que aparecem NA TELA. */
const emails = await pagina.evaluate(() =>
  [...document.body.innerText.matchAll(/\b([a-z]+)@local\.test\b/g)].map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i),
);
conferir(emails.length === ESPERADO.length, "🔴 todo mundo do grupo está na tela -- ninguém sumiu do índice", emails.join(", "));
conferir(JSON.stringify(emails) === JSON.stringify(ESPERADO), "🔴 e em ordem ALFABÉTICA de apelido, não de criação", emails.join(" < "));
conferir(!/g-beta|CLIENTE DO BETA/.test(await pagina.evaluate(() => document.body.innerText)), "gente de OUTRO escritório não aparece");
conferir(problemas.length === 0, "nenhum erro de página nem resposta >= 400", problemas.join("; "));

await navegador.close();
const falhas = checagens.filter((c) => !c.ok).length;
console.log(`\n${checagens.length - falhas}/${checagens.length} checagens${falhas ? ` -- ${falhas} FALHA(S)` : " ok"}`);
process.exit(falhas ? 1 : 0);
