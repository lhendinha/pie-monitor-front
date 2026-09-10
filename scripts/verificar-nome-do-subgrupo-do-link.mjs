/** O NOME do subgrupo no quadro aberto por link, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline   (esperar "Server ready")
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-nome-do-subgrupo-do-link.mjs
 *
 * 🔴 O caso: o link aponta para um subgrupo FORA da primeira página da pílula,
 * e o navegador lembra OUTRO subgrupo. A pílula, o modal e a confirmação do
 * lote têm que dizer o nome do subgrupo do link -- nem o lembrado, nem o id.
 *
 * ⚠️ Descobre os dois subgrupos pela API do offline. Abre a confirmação de
 * excluir e CANCELA: não escreve nada.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 9c.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const API = "http://localhost:8099";
const FOTOS = "/tmp/fase9c";
const PRIMEIRA_PAGINA = 50;

const { access_token: token } = await (await fetch(`${API}/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "chefe@local.test", password: "Senha!Local1" }),
})).json();
const api = async (caminho) => (await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${token}` } })).json();

const primeira = (await api(`/subgrupos?tamanho_pagina=${PRIMEIRA_PAGINA}`)).subgrupos;
const todos = [];
for (let pagina = 1; ; pagina += 1) {
  const r = await api(`/subgrupos?pagina=${pagina}&tamanho_pagina=${PRIMEIRA_PAGINA}`);
  todos.push(...r.subgrupos);
  if (!r.subgrupos.length || pagina >= (r.total_paginas ?? 1)) break;
}
const naPrimeira = new Set(primeira.map((s) => s.subgrupo_id));
let doLink = null, tarefa = null;
for (const s of todos.filter((x) => !naPrimeira.has(x.subgrupo_id))) {
  const r = await api(`/tarefas?subgrupo_id=${s.subgrupo_id}&tamanho_pagina=5`);
  if (r.tarefas?.length) { doLink = s; tarefa = r.tarefas[0]; break; }
}
const lembrado = primeira.find((s) => s.nome !== doLink?.nome);
if (!doLink || !lembrado) { console.log("sem dados para o caso", { total: todos.length, primeira: primeira.length }); process.exit(2); }
console.log(`passo: link=${doLink.nome} (${doLink.subgrupo_id}) | lembrado=${lembrado.nome} | tarefa=${tarefa.titulo}`);

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e)));
const veredito = [];
const ok = (nome, cond, det = "") => { veredito.push([nome, Boolean(cond), det]); };

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill("chefe@local.test");
await pagina.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");
await pagina.evaluate(([id, nome]) => localStorage.setItem("pje-monitor-ultimo-subgrupo-kanban", JSON.stringify({ id, nome })), [lembrado.subgrupo_id, lembrado.nome]);

/** Quantos elementos folha dizem EXATAMENTE cada texto -- fora do sino fechado. */
const quemAparece = () => pagina.evaluate((textos) => {
  const folhas = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0);
  return Object.fromEntries(textos.map((t) => [t, folhas.filter((e) => e.textContent?.trim() === t).length]));
}, [doLink.nome, lembrado.nome, doLink.subgrupo_id]);

await pagina.goto(`${APP}/tarefas/${doLink.subgrupo_id}/${tarefa.tarefa_id}`);
await pagina.getByRole("heading", { name: "Editar tarefa" }).waitFor({ timeout: 10000 });
await pagina.waitForLoadState("networkidle");
await pagina.waitForTimeout(800);
const comModal = await quemAparece();
await pagina.screenshot({ path: `${FOTOS}-1-modal.png` });
ok(`com o modal: "${doLink.nome}" aparece`, comModal[doLink.nome] > 0, JSON.stringify(comModal));
ok(`com o modal: o lembrado "${lembrado.nome}" NÃO aparece`, comModal[lembrado.nome] === 0, JSON.stringify(comModal));
ok("com o modal: o id NÃO aparece", comModal[doLink.subgrupo_id] === 0, JSON.stringify(comModal));

await pagina.getByRole("button", { name: "Cancelar", exact: true }).click();
await pagina.waitForTimeout(400);
const semModal = await quemAparece();
ok(`a pílula diz "${doLink.nome}"`, semModal[doLink.nome] > 0, JSON.stringify(semModal));
ok("a pílula não diz o lembrado nem o id", semModal[lembrado.nome] === 0 && semModal[doLink.subgrupo_id] === 0, JSON.stringify(semModal));

await pagina.getByRole("button", { name: "Selecionar", exact: true }).click();
await pagina.waitForTimeout(300);
await pagina.getByText(tarefa.titulo, { exact: true }).first().click();
await pagina.getByRole("button", { name: "Excluir 1", exact: true }).click();
const dialogo = pagina.getByRole("dialog");
await dialogo.waitFor();
const frase = (await dialogo.textContent()) ?? "";
await pagina.screenshot({ path: `${FOTOS}-2-confirmacao.png` });
ok(`a confirmação diz "de ${doLink.nome}"`, frase.includes(`de ${doLink.nome}`), frase.slice(0, 160));
ok("a confirmação não diz o lembrado", !frase.includes(`de ${lembrado.nome}`), frase.slice(0, 160));
await dialogo.getByRole("button", { name: "Cancelar", exact: true }).click();
ok("nenhum erro de página", erros.length === 0, erros.join(" | "));

await navegador.close();
let falhas = 0;
for (const [nome, passou, det] of veredito) {
  if (!passou) falhas += 1;
  console.log(`  ${passou ? "ok  " : "FALHOU"} ${nome}${det && !passou ? ` -- ${det}` : ""}`);
}
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
