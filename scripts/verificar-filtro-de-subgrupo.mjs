/** O filtro por subgrupo em Atendimentos e Documentos, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174 --strictPort
 *   3) node scripts/verificar-filtro-de-subgrupo.mjs
 *
 * 🔴 Por que Chrome e não jsdom: o controle é um `Select` do Chakra, e esta
 * base já registrou o caso em que o jsdom clicava no input escondido enquanto
 * o mouse acertava outro elemento -- o teste passava e a tela não funcionava.
 * O que só o navegador prova aqui é que **clicar na pílula filtra de verdade**.
 *
 * ⚠️ O cenário exige DOIS subgrupos com conteúdo diferente. Com um só, uma
 * listagem que ignora o filtro dá o mesmo resultado de uma que o respeita --
 * e o script passaria sem provar nada.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
/** Subgrupo que tem conteúdo nas DUAS telas -- ver o aviso do cabeçalho. */
const SUBGRUPO_COM_CONTEUDO = "Resumo";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 40 });
const pagina = await (await navegador.newContext({ viewport: { width: 1500, height: 980 } })).newPage();

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

async function entrar() {
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.getByLabel(/e-mail/i).fill(CONTA.email);
  // ⚠️ Por ROLE: `getByLabel(/senha/i)` casa também com "Mostrar senha".
  await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
}

/** O que a PRÓPRIA TELA declara: "Mostrando X de Y".
 *
 * 🔴 A primeira versão contava `tbody tr`, e isso rendeu um falso ✅:
 * Atendimentos renderiza cartões, não linhas de tabela, então o contador
 * devolvia 0 antes e 0 depois -- e "a lista não cresceu" passava sem provar
 * nada. Ler a frase da tela é mais forte: é o número que a pessoa vê, e ele
 * existe igual nas duas telas. */
async function mostrando() {
  const texto = await pagina.getByText(/^Mostrando \d+ de /).first().innerText();
  const [, x, y] = texto.match(/Mostrando (\d+) de (\d+)/) || [];
  return { visiveis: Number(x), total: Number(y) };
}

async function conferirTela(rota, nome) {
  await pagina.goto(`${APP}/${rota}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(800);

  const pilula = pagina.getByText("Todos os subgrupos");
  const apareceu = await pilula.isVisible().catch(() => false);
  conferir(apareceu, `${nome}: a pílula aparece com mais de um subgrupo`);
  if (!apareceu) return;

  const antes = await mostrando();
  conferir(antes.total > 0, `${nome}: há conteúdo para filtrar`, `${antes.total} no total`);
  if (!antes.total) return;

  // 🔴 O clique de verdade -- é isto que o jsdom não prova.
  await pilula.click();
  const alvo = pagina.getByRole("option", { name: SUBGRUPO_COM_CONTEUDO });
  await alvo.waitFor({ timeout: 5000 });
  await alvo.click();
  await pagina.waitForTimeout(1200);

  const depois = await mostrando();
  const url = new URL(pagina.url());

  conferir(
    url.searchParams.has("subgrupo"),
    `${nome}: a escolha vai para a URL`,
    url.search || "(sem query)",
  );
  /* 🔴 As DUAS pontas, e é isso que separa "filtrou" de "quebrou":
     - `> 0`  -- ainda mostra o que é daquele subgrupo (não zerou tudo);
     - `< antes` -- deixou de fora o que é dos outros (filtrou mesmo). */
  conferir(
    depois.total > 0 && depois.total < antes.total,
    `${nome}: "${SUBGRUPO_COM_CONTEUDO}" mostra os dele e esconde os outros`,
    `${antes.total} -> ${depois.total}`,
  );
}

await entrar();
await conferirTela("atendimentos", "Atendimentos");
await conferirTela("documentos", "Documentos");

console.log(`\n${problemas.length ? "⚠️ " + problemas.join(" | ") : "sem erro de página nem 4xx/5xx"}`);
const falhas = checagens.filter((c) => !c.ok).length;
console.log(falhas ? `\n❌ ${falhas} checagem(ns) falharam` : "\n✅ todas as checagens passaram");
await navegador.close();
process.exit(falhas ? 1 : 0);
