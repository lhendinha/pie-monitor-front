/** A seleção em lote na Agenda, em Chrome de verdade e com a lista cheia.
 *
 *   1) cd ../api && yarn offline   (esperar "Server ready")
 *      .venv/bin/python scripts/offline/semear_muitos_subgrupos.py
 *      .venv/bin/python scripts/offline/semear_abas.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-selecao-na-agenda.mjs
 *
 * 🔴 A Agenda mostra a MESMA tarefa em dois lugares -- a pilha de dias e o
 * cartão "Hoje" da lateral. Marcar num e ver o outro acender é a asserção
 * central daqui, e é um caso que jsdom conta mas não desenha.
 *
 * ⚠️ Semear cheio é o ponto: com três linhas a barra cabe em qualquer
 * largura e o transbordo nunca aparece.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 4.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
const FOTOS = "/tmp/agenda-selecao";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
const pagina = await contexto.newPage();
const erros = [];
pagina.on("console", (m) => m.type() === "error" && erros.push(m.text()));
pagina.on("pageerror", (e) => erros.push(String(e)));
const respostas = [];
contexto.on("response", (r) => r.status() >= 400 && respostas.push(`${r.status()} ${r.url()}`));
contexto.on("requestfailed", (r) => respostas.push(`FALHOU ${r.url()}`));

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");
console.log("1/7  entrou");

await pagina.goto(`${APP}/agenda`);
await pagina.getByRole("heading", { name: "Agenda" }).waitFor();
await pagina.waitForLoadState("networkidle");
await pagina.screenshot({ path: `${FOTOS}-1-antes.png` });
console.log("2/7  Agenda carregou (visão por mês)");

await pagina.getByRole("button", { name: "Selecionar", exact: true }).click();
await pagina.waitForTimeout(400);
await pagina.screenshot({ path: `${FOTOS}-2-modo.png` });

const pilula = pagina.getByRole("button", { name: /Por mês|Em lista/ }).first();
const travada = await pilula.isDisabled();
const rotulo = (await pilula.textContent())?.trim();
console.log(`3/7  modo ligado -- pílula "${rotulo}", desabilitada: ${travada}`);

const faixa = await pagina.getByText(/de \d+ selecionadas/).first().textContent();
const totalDaFaixa = Number(faixa.match(/de (\d+)/)[1]);
console.log(`4/7  a barra diz "${faixa.trim()}"`);

/* A asserção central: marcar no cartão "Hoje" e ver a pilha acender. O
   cartão é a ÚLTIMA ocorrência da tarefa no DOM -- ele vem depois da pilha. */
const primeiroTitulo = await pagina.evaluate(() => {
  const caixas = [...document.querySelectorAll("label[data-part='root'][aria-label^='Selecionar ']")];
  return caixas.length ? caixas[caixas.length - 1].getAttribute("aria-label").replace("Selecionar ", "") : null;
});
const daTarefa = pagina.locator(`label[aria-label="Selecionar ${primeiroTitulo}"]`);
const quantasVezes = await daTarefa.count();
await daTarefa.last().click();
await pagina.waitForTimeout(250);
const estados = await daTarefa.evaluateAll((ns) => ns.map((n) => n.getAttribute("data-state")));
console.log(`5/7  "${primeiroTitulo}" aparece ${quantasVezes}x -- estados: ${estados.join(", ")}`);
await pagina.screenshot({ path: `${FOTOS}-3-marcada.png` });

await pagina.getByRole("button", { name: /Selecionar todas as/ }).click();
await pagina.waitForTimeout(300);
const cheia = await pagina.getByText(/de \d+ selecionadas/).first().textContent();
await pagina.screenshot({ path: `${FOTOS}-4-todas.png`, fullPage: true });
console.log(`6/7  todas -- "${cheia.trim()}"`);

await pagina.getByRole("button", { name: /^Excluir \d+$/ }).click();
const dialogo = pagina.getByRole("dialog");
await dialogo.waitFor();
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: `${FOTOS}-5-confirmacao.png` });
const textoDoDialogo = (await dialogo.textContent()).replace(/\s+/g, " ").trim();
console.log(`7/7  confirmação: ${textoDoDialogo.slice(0, 200)}`);

/* Transbordo horizontal: a barra tem `flex-wrap`, mas com 58 na contagem e
   um aviso longo é aqui que a régua se mede -- não no jsdom. */
const transbordo = await pagina.evaluate(() => ({
  documento: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  largura: document.documentElement.scrollWidth,
  janela: document.documentElement.clientWidth,
}));

console.log("\n--- veredito ---");
console.log(`pílula travada em lista........ ${travada && rotulo === "Em lista" ? "ok" : "FALHOU: " + rotulo + "/" + travada}`);
console.log(`a tarefa aparece nas 2 listas.. ${quantasVezes === 2 ? "ok" : "FALHOU: " + quantasVezes + "x"}`);
console.log(`marcar num acende no outro..... ${estados.every((e) => e === "checked") ? "ok" : "FALHOU: " + estados.join(",")}`);
console.log(`todas marca as ${totalDaFaixa}............ ${cheia.includes(`${totalDaFaixa} de ${totalDaFaixa}`) ? "ok" : "FALHOU: " + cheia.trim()}`);
console.log(`sem transbordo horizontal...... ${transbordo.documento ? `FALHOU: ${transbordo.largura} > ${transbordo.janela}` : "ok"}`);
/* ⚠️ O 404 genérico do console SEM nenhuma resposta >= 400 no contexto é o
   `/favicon.ico` que o Chrome pede por conta própria -- o `index.html` não
   declara ícone. Não é desta tela, e contá-lo faria o veredito mentir para
   sempre. Qualquer 404 da aplicação aparece em `respostas`. */
const doNavegador = (m) => /Failed to load resource.*404/.test(m) && respostas.length === 0;
const deVerdade = [...new Set(erros)].filter((m) => !doNavegador(m));
console.log(`sem erro no console............ ${deVerdade.length ? "FALHOU: " + JSON.stringify(deVerdade, null, 1) : "ok (o 404 do favicon é do navegador)"}`);
console.log("respostas >= 400:", JSON.stringify([...new Set(respostas)], null, 1));
console.log(`\nfotos em ${FOTOS}-*.png`);

await pagina.waitForTimeout(2500);
await navegador.close();
