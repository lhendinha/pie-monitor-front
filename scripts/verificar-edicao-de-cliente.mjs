/** A guarda de papel no formulário de cliente, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-edicao-de-cliente.mjs
 *
 * 🔴 São TRÊS papéis, e o do meio é o que prova a régua. `admin` atende a
 * `manager` na hierarquia, então uma conta admin nunca revela um botão que
 * some abaixo de admin -- com só `user` e `admin`, uma guarda escrita como
 * `papelAtende("admin")` passaria igual.
 *
 * ⚠️ E o que jsdom não mostra: se o campo travado continua LEGÍVEL. Foi o
 * que decidiu `readOnly` em vez de `disabled` -- medido aqui em Chrome, o
 * `opacity: 0.5` do `disabled` deixava o texto em 3,26:1 sobre o branco.
 * Ver `medir-contraste-desabilitado.mjs`.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const SENHA = "Senha!Local1";
const CONTAS = {
  user: "user@local.test",
  manager: "gerente@local.test",
  admin: "movida@local.test",
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const contexto = await navegador.newContext({ viewport: { width: 1500, height: 980 } });
const pagina = await contexto.newPage();

const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  const p = new URL(r.url()).pathname;
  if (r.status() >= 400 && !p.includes("favicon")) problemas.push(`${r.status()} ${p}`);
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

async function entrarComo(papel) {
  await contexto.clearCookies();
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.evaluate(() => localStorage.clear());
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.getByLabel(/e-mail/i).fill(CONTAS[papel]);
  // ⚠️ Por ROLE: `getByLabel(/senha/i)` casa também com "Mostrar senha".
  await pagina.getByRole("textbox", { name: "Senha" }).fill(SENHA);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
}

/** Abre o primeiro cliente da listagem e devolve o estado da tela. */
async function abrirPrimeiroCliente() {
  await pagina.goto(`${APP}/clientes`, { waitUntil: "networkidle" });
  await pagina.locator("table tbody tr").first().click();
  const nome = pagina.locator("#nome-cliente-edicao");
  await nome.waitFor({ timeout: 15000 });
  return {
    nomeVisivel: await nome.isVisible(),
    /* ⚠️ `isEnabled()` NÃO serve: um input `readOnly` está "enabled" pro
       Playwright. A pergunta é outra -- o atributo existe? */
    nomeTravado: await nome.evaluate((el) => el.readOnly),
    valorDoNome: await nome.inputValue(),
    temSalvar: await pagina.getByRole("button", { name: /^Salvar/ }).isVisible().catch(() => false),
    temExcluir: await pagina.getByRole("button", { name: "Excluir" }).isVisible().catch(() => false),
    contraste: await nome.evaluate((el) => {
      const s = getComputedStyle(el);
      return { cor: s.color, fundo: s.backgroundColor, opacidade: s.opacity };
    }),
  };
}

// --- user: vê e não edita ------------------------------------------------
await entrarComo("user");
const comoUser = await abrirPrimeiroCliente();
conferir(comoUser.nomeVisivel, "user: o campo Nome continua VISÍVEL");
conferir(comoUser.nomeTravado, "user: o campo Nome está em readOnly");
conferir(comoUser.valorDoNome.length > 0, "user: ainda LÊ o que está cadastrado", comoUser.valorDoNome);
conferir(!comoUser.temSalvar, "user: sem botão Salvar");
conferir(!comoUser.temExcluir, "user: sem botão Excluir");
conferir(
  comoUser.contraste.opacidade === "1",
  "🔴 user: o texto NÃO está apagado -- opacidade cheia",
  `opacidade ${comoUser.contraste.opacidade}`,
);

// --- manager: edita, não exclui -----------------------------------------
await entrarComo("manager");
const comoManager = await abrirPrimeiroCliente();
conferir(!comoManager.nomeTravado, "manager: o campo Nome está EDITÁVEL");
conferir(comoManager.temSalvar, "manager: tem botão Salvar");
conferir(!comoManager.temExcluir, "manager: NÃO tem Excluir (é `admin`)");

// --- admin: faz os dois --------------------------------------------------
await entrarComo("admin");
const comoAdmin = await abrirPrimeiroCliente();
conferir(!comoAdmin.nomeTravado, "admin: o campo Nome está EDITÁVEL");
conferir(comoAdmin.temSalvar, "admin: tem botão Salvar");
conferir(comoAdmin.temExcluir, "admin: tem botão Excluir");

// --- o que de fato prova a régua ----------------------------------------
conferir(
  comoUser.nomeTravado && !comoManager.nomeTravado,
  "🔴 a régua de EDITAR muda entre `user` e `manager`",
);
conferir(
  !comoManager.temExcluir && comoAdmin.temExcluir,
  "🔴 a régua de EXCLUIR muda entre `manager` e `admin`",
);

conferir(problemas.length === 0, "nenhum erro de página nem resposta >= 400", problemas.join(" | "));

const falhas = checagens.filter((c) => !c.ok);
console.log(`\n${falhas.length ? `❌ ${falhas.length} falha(s)` : `✅ ${checagens.length} checagens, todas passaram`}`);
await navegador.close();
process.exit(falhas.length ? 1 : 0);
