/** A aba "Inscrições na OAB" do grupo -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-inscricoes-do-grupo.mjs
 *
 * 🔴 O que só Chrome responde, e que o jsdom dá como aprovado:
 *
 *   - o MODAL com `MultiSelect` dentro: o painel do `react-select` vai em
 *     PORTAL, e em jsdom ele "abre" sem layout. Aqui dá para ver se ele cabe
 *     na tela, se fica por cima da cortina do modal, e se o Escape fecha só o
 *     painel em vez de levar o formulário junto -- defeito real, registrado no
 *     artifact;
 *   - as MEDIDAS do cabeçalho e da tabela contra o artifact: altura da faixa,
 *     recuo das células, o `×` de 22px, a etiqueta do contador;
 *   - o ciclo inteiro contra a API de verdade: cadastrar, recarregar a página,
 *     e a inscrição continuar lá.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
/** ⚠️ OAB de teste que o tribunal conhece -- o servidor VALIDA a nova contra
 *  o PJe (`garantir_que_existem_no_tribunal`), então uma inventada é recusada
 *  com razão, e o teste passaria a medir a recusa em vez da tela. */
const OAB = { numero: "206876", uf: "MG" };

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 30 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login")) {
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  }
});

const checagens = [];
const conferir = (o, nome, detalhe = "") => {
  checagens.push({ ok: o, nome, detalhe });
  console.log(`${o ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();
console.log("entrou\n");

await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
await pagina.getByText("Inscrições da OAB").waitFor();

// ── o cabeçalho, dentro do cartão ─────────────────────────────────────────
const cabecalho = await pagina.evaluate(() => {
  const titulo = [...document.querySelectorAll("*")].find(
    (e) => e.textContent?.trim() === "Inscrições da OAB" && e.children.length === 0,
  );
  const faixa = titulo?.closest("div[class]")?.parentElement?.parentElement;
  const cartao = titulo?.closest('[class*="css"]');
  const estiloDaFaixa = faixa ? getComputedStyle(faixa) : null;
  return {
    fundoDaFaixa: estiloDaFaixa?.backgroundColor,
    bordaDeBaixo: estiloDaFaixa?.borderBottomWidth,
    temCartao: Boolean(cartao),
  };
});
conferir(
  cabecalho.bordaDeBaixo === "1px",
  "o cabeçalho tem a divisória embaixo",
  `borderBottom=${cabecalho.bordaDeBaixo}`,
);

await pagina.screenshot({ path: "/tmp/insc-1-aba.png" });

// ── o modal ───────────────────────────────────────────────────────────────
await pagina.getByRole("button", { name: "Adicionar inscrição" }).click();
await pagina.getByRole("heading", { name: "Adicionar inscrição" }).waitFor();
await pagina.screenshot({ path: "/tmp/insc-2-modal.png" });

const medidasDoModal = await pagina.evaluate(() => {
  const dialogo = document.querySelector('[role="dialog"]');
  if (!dialogo) return null;
  const r = dialogo.getBoundingClientRect();
  const e = getComputedStyle(dialogo);
  return {
    largura: Math.round(r.width),
    altura: Math.round(r.height),
    raio: e.borderRadius,
    caiNaTela: r.top >= 0 && r.bottom <= innerHeight,
  };
});
conferir(Boolean(medidasDoModal), "o modal abriu");
if (medidasDoModal) {
  console.log(`       modal: ${medidasDoModal.largura}x${medidasDoModal.altura}, raio ${medidasDoModal.raio}`);
  conferir(medidasDoModal.caiNaTela, "o modal cabe na tela", `altura ${medidasDoModal.altura}`);
}

await pagina.getByLabel(/Número/).fill(OAB.numero);
await pagina.getByLabel(/^UF/).click();
await pagina.getByText(OAB.uf, { exact: true }).last().click();

// 🔴 O MultiSelect DENTRO do modal, e o Escape.
/* ⚠️ O clique vai no RÓTULO, não no input: o Chakra v3 esconde o
   `input` e desenha o trilho por cima, que intercepta o ponteiro.
   Medido -- clicar no input dá timeout. */
await pagina.getByText("Cadastrar sozinho os processos desta inscrição").click();
await pagina.getByLabel(/Subgrupos de destino/).click();
const painelVisivel = await pagina.getByRole("option").first().isVisible().catch(() => false);
conferir(painelVisivel, "o painel do MultiSelect abre dentro do modal");
await pagina.screenshot({ path: "/tmp/insc-3-multiselect.png" });

await pagina.keyboard.press("Escape");
const modalSobreviveu = await pagina.getByRole("dialog").isVisible().catch(() => false);
conferir(
  modalSobreviveu,
  "🔴 o Escape fecha SÓ o painel, não o modal",
  modalSobreviveu ? "" : "o formulário foi embora junto -- defeito registrado no artifact",
);

if (modalSobreviveu) {
  await pagina.getByLabel(/Subgrupos de destino/).click();
  await pagina.getByRole("option").first().click();
  await pagina.keyboard.press("Escape");
  /* ⚠️ `exact`: sem ele, "Adicionar" casa também com "Adicionar inscrição",
     que continua na tela atrás da cortina. */
  await pagina.getByRole("button", { name: "Adicionar", exact: true }).click();

  await pagina.getByText(`${OAB.numero}/${OAB.uf}`).waitFor({ timeout: 30_000 });
  conferir(true, "a inscrição foi cadastrada e apareceu na tabela");
  await pagina.screenshot({ path: "/tmp/insc-4-cadastrada.png" });

  // ── as medidas da linha, contra o artifact ──
  const linha = await pagina.evaluate((alvo) => {
    const celula = [...document.querySelectorAll("td")].find((c) =>
      c.textContent?.includes(alvo),
    );
    const tr = celula?.closest("tr");
    if (!tr) return null;
    const tds = [...tr.querySelectorAll("td")];
    const botao = celula?.querySelector("button");
    const x = tds[3]?.querySelector("button");
    const rx = x?.getBoundingClientRect();
    return {
      recuo: getComputedStyle(tds[0]).padding,
      fonteDaInscricao: getComputedStyle(botao ?? tds[0]).fontFamily.split(",")[0],
      pesoDaInscricao: getComputedStyle(botao ?? tds[0]).fontWeight,
      textoDoInterruptor: tds[1]?.textContent?.trim(),
      destinos: tds[2]?.textContent?.trim(),
      xLargura: rx ? Math.round(rx.width) : null,
      xAltura: rx ? Math.round(rx.height) : null,
    };
  }, `${OAB.numero}/${OAB.uf}`);
  console.log("       linha:", JSON.stringify(linha));
  if (linha) {
    conferir(linha.recuo === "13px 14px", "a célula tem o recuo de `.tbl td`", linha.recuo);
    conferir(/Mono/i.test(linha.fonteDaInscricao), "a inscrição é mono", linha.fonteDaInscricao);
    conferir(linha.pesoDaInscricao === "600", "e 600", linha.pesoDaInscricao);
    conferir(linha.textoDoInterruptor === "Ligada", "o interruptor diz o estado", linha.textoDoInterruptor);
    conferir(linha.xLargura === 22 && linha.xAltura === 22, "o × é 22x22", `${linha.xLargura}x${linha.xAltura}`);
  }

  // ── o ciclo fecha: recarregar e a inscrição continua lá ──
  await pagina.reload();
  await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
  const sobreviveu = await pagina
    .getByText(`${OAB.numero}/${OAB.uf}`)
    .isVisible()
    .catch(() => false);
  conferir(sobreviveu, "sobrevive ao recarregar -- gravou de verdade");

  // ── limpa o que este teste criou ──
  if (sobreviveu) {
    await pagina.getByRole("button", { name: `Remover ${OAB.numero}/${OAB.uf}` }).click();
    await pagina.getByRole("button", { name: "Remover", exact: true }).click();
    await pagina.getByText("Nenhuma inscrição cadastrada.").waitFor({ timeout: 20_000 });
    conferir(true, "removida -- o ambiente volta como estava");
  }
}

console.log("\n" + "─".repeat(60));
for (const p of problemas) console.log(`⚠️  ${p}`);
const falhas = checagens.filter((c) => !c.ok);
console.log(`${checagens.length - falhas.length}/${checagens.length} checagens ok`);
if (falhas.length) console.log("FALHAS: " + falhas.map((f) => f.nome).join(" | "));

await pagina.waitForTimeout(2000);
await navegador.close();
process.exit(falhas.length || problemas.length ? 1 : 0);
