/** O calendário troca de vista sem empilhar, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174 --strictPort
 *   3) node scripts/verificar-seletor-de-data.mjs
 *
 * 🔴 **Por que Chrome e não jsdom, com nome e sobrenome:** o Chakra marca
 * `hidden` na vista que não é a atual, e a receita dele põe `display: flex`
 * no MESMO elemento -- que ganha do `display: none` que o navegador dá ao
 * `[hidden]`. As três vistas apareciam empilhadas na tela. O jsdom lê o
 * atributo `hidden` (que está lá, correto) e não computa folha de estilo:
 * o teste de unidade passava com o defeito na tela.
 *
 * ⚠️ A asserção é sobre a ALTURA COMPUTADA, não sobre o atributo. É a única
 * pergunta que distingue "marcado como escondido" de "escondido".
 *
 * ⚠️ `APP_URL` porque a 5174 pode estar ocupada por um dev de outra árvore.
 */
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

let ok = 0;
let ruim = 0;
function dizer(passou, o_que, detalhe = "") {
  console.log(`  ${passou ? "OK  " : "RUIM"}  ${o_que}${detalhe ? ` -- ${detalhe}` : ""}`);
  passou ? ok++ : ruim++;
}

const navegador = await chromium.launch();
const pagina = await (
  await navegador.newContext({ viewport: { width: 1440, height: 1400 } })
).newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 120)));

/** Altura computada de cada vista do calendário, na ordem dia, mês, ano. */
const alturas = () =>
  pagina.evaluate(() =>
    [...document.querySelectorAll('[data-part="view"]')].map((v) =>
      Math.round(v.getBoundingClientRect().height),
    ),
  );

try {
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
  await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });

  await pagina.goto(`${APP}/financeiro?aba=configuracoes`, { waitUntil: "networkidle" });
  await pagina.getByRole("button", { name: "Contas" }).click();
  await pagina.getByRole("button", { name: "+ Nova conta" }).click();
  await pagina.getByText(/^\d{2}\/\d{2}\/\d{4}$/).first().click();
  await pagina.waitForTimeout(700);

  const noDia = await alturas();
  dizer(noDia.length === 3, "as três vistas existem no DOM", `alturas: ${noDia}`);
  dizer(
    noDia.filter((h) => h > 0).length === 1,
    "🔴 só UMA vista ocupa espaço -- a de dia",
    `alturas: ${noDia}`,
  );

  /* Clique pelo DOM: o painel abre abaixo da dobra em janela alta, e o que
     se prova aqui é a troca de vista, não o alcance do ponteiro. */
  await pagina.getByRole("button", { name: "Escolher o mês" }).evaluate((el) => el.click());
  await pagina.waitForTimeout(700);
  const noMes = await alturas();
  dizer(noMes.filter((h) => h > 0).length === 1, "e continua UMA na vista de mês", `alturas: ${noMes}`);
  dizer(noMes[1] > 0 && noMes[0] === 0, "a que aparece é a de MÊS", `alturas: ${noMes}`);
  dizer(
    (await pagina.getByText("setembro", { exact: true }).count()) > 0,
    "os meses estão em português",
  );

  await pagina.getByRole("button", { name: "Escolher o ano" }).evaluate((el) => el.click());
  await pagina.waitForTimeout(700);
  const noAno = await alturas();
  dizer(noAno.filter((h) => h > 0).length === 1, "e UMA na vista de ano", `alturas: ${noAno}`);
  dizer(noAno[2] > 0, "a que aparece é a de ANO", `alturas: ${noAno}`);

  dizer(erros.length === 0, "nenhum erro derrubou a tela", erros.join(" | "));
} finally {
  console.log(`\n${ok}/${ok + ruim} conferências passaram`);
  await navegador.close();
}
process.exit(ruim ? 1 : 0);
