/** Ponta a ponta das duas entregas, na stack offline inteira.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *      .venv/bin/python scripts/offline/semear_abas.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-ponta-a-ponta.mjs
 *
 * 🔴 O que este roteiro prova e os testes de unidade NÃO provam: que o dado
 * atravessa o sistema. Tela -> API -> DynamoDB -> API -> tela, com o ViaCEP
 * de verdade no meio. Um mock casa com o que eu ACHO que a API devolve;
 * aqui a API responde por si.
 *
 * ⚠️ Passa pelos TRÊS papéis, e o do meio é o que prova as réguas: `admin`
 * atende a `manager`, então uma guarda escrita como `papelAtende("admin")`
 * passaria despercebida com só duas contas.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const SENHA = "Senha!Local1";
const CONTAS = {
  user: "user@local.test",
  manager: "gerente@local.test",
  admin: "movida@local.test",
};
const PROCESSO_SEMEADO = "/processos/3bc2708f19ca/90000000000000000000";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const contexto = await navegador.newContext({ viewport: { width: 1500, height: 980 } });
const pagina = await contexto.newPage();

const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  const p = new URL(r.url()).pathname;
  // 404 de CEP e 403 do `user` são caminhos que este roteiro EXERCITA.
  const esperado = p.startsWith("/cep/") || (r.status() === 403 && p.startsWith("/clientes"));
  if (r.status() >= 400 && !p.includes("favicon") && !esperado) problemas.push(`${r.status()} ${p}`);
});

const PROVEDORES_DE_CEP = ["viacep", "opencep", "brasilapi", "cepaberto", "widenet"];
const provedoresChamadosDireto = new Set();
pagina.on("request", (r) => {
  const host = new URL(r.url()).host;
  if (!host.startsWith("localhost") && PROVEDORES_DE_CEP.some((p) => host.includes(p))) {
    provedoresChamadosDireto.add(host);
  }
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};
const secao = (t) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 58 - t.length))}`);

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

/** 🔴 Nome ÚNICO por execução. Sem isto a segunda rodada reencontra o
 * cliente da primeira (renomeado, com o complemento já esvaziado no passo 4)
 * e falha em cima do próprio rastro -- roteiro que só passa na primeira
 * execução não serve pra rodar antes de subir. */
const CARIMBO = new Date().toISOString().slice(11, 19).replace(/:/g, "");
const NOME_DO_CLIENTE = `Cliente ponta a ponta ${CARIMBO}`;

// ═══ 1. cadastrar com endereço, como manager ═════════════════════════════
secao("1. cadastro com CEP (manager)");
await entrarComo("manager");
await pagina.goto(`${APP}/clientes`, { waitUntil: "networkidle" });
await pagina.getByRole("button", { name: /Novo cliente/i }).click();
await pagina.locator("#nome-cliente").fill(NOME_DO_CLIENTE);

await pagina.locator("#cep-cliente").fill("3013001");
await pagina.waitForTimeout(700);
conferir(
  (await pagina.locator("#logradouro-cliente").inputValue()) === "",
  "com 7 dígitos não consulta -- a guarda que dispensa o debounce",
);

await pagina.locator("#cep-cliente").fill("30130-010");
await pagina.waitForFunction(
  () => document.querySelector("#logradouro-cliente")?.value?.length > 0,
  { timeout: 20000 },
);
conferir(
  (await pagina.locator("#logradouro-cliente").inputValue()) === "Praça Sete de Setembro",
  "o ViaCEP respondeu PELA NOSSA API e preencheu a tela",
);
conferir(
  (await pagina.evaluate(() => document.activeElement?.id)) === "numero-cliente",
  "o foco foi pro Número",
);

await pagina.locator("#numero-cliente").fill("S/N");
await pagina.locator("#complemento-cliente").fill("Sala 302");
await pagina.getByRole("button", { name: /Cadastrar/ }).click();
await pagina.getByText(NOME_DO_CLIENTE).first().waitFor({ timeout: 20000 });
conferir(true, "cliente gravado e de volta na listagem");

// ═══ 2. o dado sobreviveu ao banco ═══════════════════════════════════════
secao("2. o endereço volta do DynamoDB");
await pagina.getByText(NOME_DO_CLIENTE).first().click();
await pagina.locator("#cep-cliente-edicao").waitFor({ timeout: 20000 });
const urlDoCliente = pagina.url();

for (const [campo, esperado] of [
  ["cep", "30130-010"],
  ["logradouro", "Praça Sete de Setembro"],
  ["numero", "S/N"],
  ["complemento", "Sala 302"],
  ["bairro", "Centro"],
  ["cidade", "Belo Horizonte"],
]) {
  const lido = await pagina.locator(`#${campo}-cliente-edicao`).inputValue();
  conferir(lido === esperado, `${campo} voltou inteiro`, lido);
}
conferir(
  (await pagina.locator("#uf-cliente-edicao").locator("xpath=ancestor::*[contains(@class,'control')][1]").innerText()).trim() === "MG",
  "UF voltou como MG",
);

// F5: prova que veio do banco, não do cache da SPA
await pagina.reload({ waitUntil: "networkidle" });
await pagina.locator("#cep-cliente-edicao").waitFor({ timeout: 20000 });
conferir(
  (await pagina.locator("#logradouro-cliente-edicao").inputValue()) === "Praça Sete de Setembro",
  "🔴 sobrevive a um F5 -- veio do banco, não do estado da tela",
);

// ═══ 3. PATCH parcial não apaga o endereço ═══════════════════════════════
secao("3. PATCH parcial");
await pagina.locator("#nome-cliente-edicao").fill(`${NOME_DO_CLIENTE} (renomeado)`);
await pagina.getByRole("button", { name: /^Salvar/ }).click();
await pagina.waitForTimeout(1500);
await pagina.reload({ waitUntil: "networkidle" });
await pagina.locator("#cep-cliente-edicao").waitFor({ timeout: 20000 });
conferir(
  (await pagina.locator("#logradouro-cliente-edicao").inputValue()) === "Praça Sete de Setembro",
  "🔴 salvar só o nome NÃO apagou o endereço",
);

// ═══ 4. esvaziar um campo grava ausência ════════════════════════════════
secao("4. esvaziar um campo");
await pagina.locator("#complemento-cliente-edicao").fill("");
await pagina.getByRole("button", { name: /^Salvar/ }).click();
await pagina.waitForTimeout(1500);
await pagina.reload({ waitUntil: "networkidle" });
await pagina.locator("#cep-cliente-edicao").waitFor({ timeout: 20000 });
conferir(
  (await pagina.locator("#complemento-cliente-edicao").inputValue()) === "",
  "complemento esvaziado ficou vazio",
);
conferir(
  (await pagina.locator("#bairro-cliente-edicao").inputValue()) === "Centro",
  "e esvaziar UM não tocou os outros seis",
);

// ═══ 5. CEP que não existe ══════════════════════════════════════════════
secao("5. CEP inexistente");
await pagina.locator("#cep-cliente-edicao").fill("12345678");
const avisou = await pagina.getByText(/CEP não encontrado/).waitFor({ timeout: 20000 })
  .then(() => true).catch(() => false);
conferir(avisou, "avisa 'preencha à mão' -- e não trava a tela");
conferir(
  (await pagina.locator("#cidade-cliente-edicao").inputValue()) === "Belo Horizonte",
  "o aviso não apagou o que já estava lá",
);

// ═══ 6. as réguas de papel ══════════════════════════════════════════════
secao("6. réguas de papel");
await entrarComo("user");
await pagina.goto(urlDoCliente, { waitUntil: "networkidle" });
await pagina.locator("#nome-cliente-edicao").waitFor({ timeout: 20000 });
conferir(
  await pagina.locator("#nome-cliente-edicao").evaluate((el) => el.readOnly),
  "`user`: campos em readOnly",
);
conferir(
  (await pagina.locator("#nome-cliente-edicao").inputValue()).length > 0,
  "`user`: ainda LÊ o cadastro",
);
conferir(
  !(await pagina.getByRole("button", { name: /^Salvar/ }).isVisible().catch(() => false)),
  "`user`: sem Salvar",
);
conferir(
  await pagina.locator("#cep-cliente-edicao").evaluate((el) => el.readOnly),
  "`user`: o CEP também trava -- não consulta o que não pode gravar",
);

await entrarComo("manager");
await pagina.goto(urlDoCliente, { waitUntil: "networkidle" });
await pagina.locator("#nome-cliente-edicao").waitFor({ timeout: 20000 });
conferir(
  !(await pagina.locator("#nome-cliente-edicao").evaluate((el) => el.readOnly)),
  "`manager`: edita",
);
conferir(
  !(await pagina.getByRole("button", { name: "Excluir" }).isVisible().catch(() => false)),
  "`manager`: NÃO exclui (é `admin`)",
);

// ═══ 7. o botão de tarefa, e a tarefa chegando ao banco ═════════════════
secao("7. Adicionar tarefa a partir da movimentação");
await entrarComo("admin");
await pagina.goto(`${APP}${PROCESSO_SEMEADO}?aba=movimentacoes`, { waitUntil: "networkidle" });
await pagina.getByText("Intimação").first().click();
await pagina.getByText("Detalhes da movimentação").waitFor({ timeout: 20000 });
conferir(
  await pagina.getByRole("button", { name: /Adicionar tarefa/ }).isVisible(),
  "o botão aparece no cabeçalho",
);

await pagina.getByRole("button", { name: /Adicionar tarefa/ }).click();
await pagina.getByText("Nova tarefa").waitFor({ timeout: 20000 });
/* 🔴 Procurado DENTRO do modal da tarefa, e não pela página.
   O número mascarado aparece DUAS vezes com o modal aberto, e a primeira
   em ordem de DOM é o `<h1>` da página atrás -- que fica INVISÍVEL sob o
   overlay. Um `.first().waitFor({visible})` espera pra sempre um elemento
   que nunca vai aparecer, e o teste falha com o vínculo funcionando. */
const modalDaTarefa = pagina.locator("[role=dialog]").filter({ hasText: "Nova tarefa" });
const vinculoNaTela = await modalDaTarefa
  .getByText("9000000-00.0000.0.00.0000")
  .waitFor({ timeout: 20000 })
  .then(() => true)
  .catch(() => false);
conferir(vinculoNaTela, "abre com o processo já vinculado");
conferir(
  await pagina.getByText("Detalhes da movimentação").isVisible(),
  "🔴 o modal de detalhes CONTINUA aberto",
);

const TITULO_DA_TAREFA = `Tarefa do ponta a ponta ${CARIMBO}`;
await pagina.getByLabel(/Descrição da tarefa/).fill(TITULO_DA_TAREFA);
await pagina.getByRole("button", { name: /^Salvar/ }).click();
await pagina.waitForTimeout(2000);
conferir(
  !(await pagina.getByText("Nova tarefa").isVisible().catch(() => false)),
  "salvar fechou o modal de tarefa",
);
conferir(
  await pagina.getByText("Detalhes da movimentação").isVisible(),
  "🔴 e o de detalhes seguiu aberto",
);

// 🔴 O que prova que o vínculo chegou ao BANCO, e não só à tela.
await pagina.keyboard.press("Escape");
await pagina.goto(`${APP}${PROCESSO_SEMEADO}?aba=tarefas`, { waitUntil: "networkidle" });
const naAba = await pagina.getByText(TITULO_DA_TAREFA).first().isVisible({ timeout: 20000 }).catch(() => false);
conferir(naAba, "🔴 a tarefa aparece na aba Tarefas DO PROCESSO -- o vínculo foi gravado");

// ═══ fecho ══════════════════════════════════════════════════════════════
secao("fecho");
conferir(
  provedoresChamadosDireto.size === 0,
  "🔴 o navegador NUNCA falou com provedor de CEP -- tudo pela nossa API",
  [...provedoresChamadosDireto].join(", "),
);
conferir(problemas.length === 0, "nenhum erro de página nem resposta inesperada", problemas.join(" | "));

const falhas = checagens.filter((c) => !c.ok);
console.log(
  `\n${falhas.length ? `❌ ${falhas.length} de ${checagens.length} falharam` : `✅ ${checagens.length} checagens, todas passaram`}`,
);
await navegador.close();
process.exit(falhas.length ? 1 : 0);
