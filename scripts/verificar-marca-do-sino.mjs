/** A marca da linha morta do sino, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline   (esperar "Server ready")
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-marca-do-sino.mjs
 *
 * ⚠️ **A resposta de `GET /notificacoes` é INTERCEPTADA**, e as três primeiras
 * linhas ganham "excluido", "sem_acesso" e "disponivel". O front sobe antes da
 * API que calcula o campo (Fase 1 do plano); a integração de verdade se confere
 * na Fase 2, com a API real. Aqui se confere a TELA: a marca, o clique e o
 * desenho.
 *
 * ➡️ `api/PLANO_SINO_COM_ALVOS_VIVOS.md`, Fase 1.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const FOTOS = "/tmp/sino-marca";
const ESTADOS = ["excluido", "sem_acesso", "disponivel"];

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e)));
const veredito = [];
const ok = (nome, cond, det = "") => { veredito.push([nome, Boolean(cond), det]); };

await pagina.route("**/notificacoes", async (rota) => {
  if (rota.request().method() !== "GET") return rota.continue();
  const resposta = await rota.fetch();
  const corpo = await resposta.json();
  /* ⚠️ A linha 0 vai NÃO LIDA à força: a rodada anterior a marcou como lida no
     offline, e aí o clique dela -- corretamente -- não faz nada. Sem isto a
     segunda rodada acusava o sino pelo estado que a primeira deixou. */
  corpo.notificacoes = (corpo.notificacoes ?? []).map((n, i) =>
    i < ESTADOS.length ? { ...n, alvo_estado: ESTADOS[i], ...(i === 0 ? { lida: false } : {}) } : n);
  await rota.fulfill({ response: resposta, json: corpo });
});

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill("chefe@local.test");
await pagina.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");

const linhas = () => pagina.evaluate(() => {
  const rolavel = [...document.querySelectorAll("div")]
    .find((e) => getComputedStyle(e).overflowY === "auto" && getComputedStyle(e).maxHeight === "420px");
  return [...(rolavel?.children ?? [])].slice(0, 3).map((linha, i) => {
    linha.setAttribute("data-linha", String(i));
    /* ⚠️ Quebra de linha não é transbordo: a primeira rodada passou com a data
       cortada na vírgula. As LINHAS do texto se contam pelos retângulos de um
       Range sobre ele. */
    const data = [...linha.querySelectorAll("p")].find((p) => getComputedStyle(p).fontFamily.toLowerCase().includes("mono"));
    let linhasDaData = null;
    if (data?.firstChild) {
      const faixa = document.createRange();
      faixa.selectNodeContents(data);
      linhasDaData = new Set([...faixa.getClientRects()].map((r) => Math.round(r.top))).size;
    }
    return {
      tag: linha.tagName, desabilitada: linha.hasAttribute("disabled"), cursor: getComputedStyle(linha).cursor,
      texto: linha.textContent.trim().slice(0, 140), transborda: linha.scrollWidth > linha.clientWidth + 1,
      linhasDaData,
    };
  });
});

await pagina.getByRole("button", { name: "Notificações" }).click();
await pagina.waitForTimeout(1200);
const antes = await linhas();
console.log(JSON.stringify(antes, null, 1));
await pagina.screenshot({ path: `${FOTOS}-1-painel.png` });
await pagina.locator("[data-linha='0']").screenshot({ path: `${FOTOS}-2-excluido.png` }).catch(() => {});
await pagina.locator("[data-linha='1']").screenshot({ path: `${FOTOS}-3-sem-acesso.png` }).catch(() => {});

ok("linha 0 mostra 'Não existe mais'", antes[0]?.texto.includes("Não existe mais"), antes[0]?.texto);
ok("linha 1 mostra 'Sem acesso'", antes[1]?.texto.includes("Sem acesso"), antes[1]?.texto);
ok("linha 2 (disponível) não tem marca", antes[2] && !/Não existe mais|Sem acesso/.test(antes[2].texto), antes[2]?.texto);
ok("🔴 as mortas continuam botões HABILITADOS", antes[0]?.tag === "BUTTON" && !antes[0].desabilitada && !antes[1].desabilitada);
ok("nenhuma das três transborda", antes.every((l) => !l.transborda), JSON.stringify(antes.map((l) => l.transborda)));
ok("🔴 a data fica numa linha só, com a marca ao lado", antes.every((l) => l.linhasDaData === 1),
  JSON.stringify(antes.map((l) => l.linhasDaData)));

const urlAntes = pagina.url();
const lida = pagina.waitForRequest((r) => r.method() === "PATCH" && /\/notificacoes\/.+\/lida$/.test(r.url()), { timeout: 5000 })
  .then(() => true).catch(() => false);
await pagina.locator("[data-linha='0']").click();
ok("clicar na morta não lida manda MARCAR LIDA", await lida);
await pagina.waitForTimeout(800);
ok("e NÃO navega", pagina.url() === urlAntes, pagina.url());
ok("e o painel continua aberto", (await pagina.locator("[data-linha='0']").count()) === 1);

await linhas();
await pagina.locator("[data-linha='2']").click();
await pagina.waitForTimeout(1500);
ok("par negativo: a disponível NAVEGA", pagina.url() !== urlAntes, pagina.url());
ok("nenhum erro de página", erros.length === 0, erros.join(" | "));

await navegador.close();
let falhas = 0;
for (const [nome, passou, det] of veredito) {
  if (!passou) falhas += 1;
  console.log(`  ${passou ? "ok  " : "FALHOU"} ${nome}${det && !passou ? ` -- ${det}` : ""}`);
}
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
