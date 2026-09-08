/** A reancoragem do vencimento -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174 --strictPort
 *   3) node scripts/verificar-serie-reancorada.mjs
 *
 * 🔴 O `vitest` roda em jsdom com a API mockada. Aqui a série é criada de
 * verdade, o calendário é clicado de verdade e as datas finais saem do
 * servidor -- é o que prova que a tela e a API concordam sobre o que "este e
 * os próximos" faz.
 *
 * ⚠️ Ele CRIA um honorário de três parcelas e apaga as três no fim.
 *
 * ⚠️ Também escuta `validateDOMNesting`: aninhamento inválido só aparece no
 * console, e o navegador fecha a tag sozinho -- foi assim que um `<div>`
 * dentro de `<p>` chegou ao aviso deste diálogo. */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const API = "http://localhost:8099";

async function api(rota, opcoes = {}, token) {
  const r = await fetch(`${API}${rota}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return r.json();
}

const { access_token: token } = await api("/login", {
  method: "POST",
  body: JSON.stringify({ email: "financeiro@local.test", password: "Senha!Local1" }),
});
const catalogo = await api("/financeiro/catalogo", {}, token);
const conta = catalogo.contas.find((c) => c.ativa).conta_id;
const categoria = catalogo.categorias.find((c) => c.natureza === "entrada" && !c.agrupador_id).categoria_id;
const { subgrupos } = await api("/subgrupos?tamanho_pagina=1", {}, token);

const criado = await api("/lancamentos/honorarios", {
  method: "POST",
  body: JSON.stringify({
    descricao: "zz-serie de conferência", valor_centavos: 100000,
    data_vencimento: "2026-11-20", conta_id: conta, categoria_id: categoria,
    contraparte: "Conferência", rateio: [{ subgrupo_id: subgrupos[0].subgrupo_id }],
    parcelas: 3,
  }),
}, token);
const ids = criado.ids;
console.log("série criada:", ids?.length, "parcelas");

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro: ${e.message.slice(0, 110)}`));
pagina.on("console", (m) => {
  if (m.type() === "error" && m.text().includes("validateDOMNesting"))
    problemas.push(`aninhamento inválido: ${m.text().slice(0, 90)}`);
});

try {
  await pagina.goto(APP);
  await pagina.getByLabel(/e-?mail/i).fill("financeiro@local.test");
  await pagina.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.getByText("Resumo rápido").waitFor();

  await pagina.goto(`${APP}/financeiro/lancamentos/${ids[0]}`);
  await pagina.getByRole("button", { name: "Salvar", exact: true }).waitFor();

  console.log("vencimento travado?", await pagina.locator("#det-vencimento").isDisabled().catch(() => "não é input"));

  // muda a data para o dia 5 do mês seguinte
  await pagina.getByLabel(/A receber em/).click();
  await pagina.getByRole("button", { name: "Próximo mês" }).click();
  await pagina.getByRole("button", { name: /^Escolher .*5 de/ }).first().click();
  await pagina.getByRole("button", { name: "Salvar", exact: true }).click();

  const dialogo = pagina.getByRole("dialog");
  await dialogo.waitFor();
  console.log("\n--- o que o diálogo diz ---");
  console.log((await dialogo.innerText()).split("\n").filter(Boolean).join("\n"));

  await dialogo.getByRole("button", { name: /Este e os próximos/ }).click();
  await dialogo.getByRole("button", { name: "Salvar", exact: true }).click();
  await pagina.getByText("Lançamento salvo.").waitFor();

  const depois = [];
  for (const id of ids) depois.push((await api(`/lancamentos/${id}`, {}, token)).data_vencimento);
  console.log("\ndatas depois:", depois);
  await pagina.screenshot({ path: "/tmp/serie.png" });
} finally {
  for (const id of ids ?? []) await api(`/lancamentos/${id}`, { method: "DELETE" }, token);
  console.log("(a série de conferência foi apagada)");
  await navegador.close();
}
console.log(problemas.length ? `PROBLEMAS: ${problemas}` : "\nNenhum erro de console.");
