/** O bloco de endereço e a busca por CEP, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-endereco-do-cliente.mjs
 *
 * 🔴 Bate no ViaCEP DE VERDADE, pela nossa API. É o que jsdom nunca prova:
 * que a rota existe, que o CSP deixa passar (o provedor não está no
 * `connect-src` -- só a nossa API está) e que o endereço chega inteiro.
 *
 * ⚠️ Roda como `gerente@local.test`: consultar CEP é `manager`+, o mesmo
 * piso de quem grava o endereço.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "gerente@local.test", senha: "Senha!Local1" };
const CEP_REAL = "30130010";
const CEP_INEXISTENTE = "12345678";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1500, height: 980 } })).newPage();

const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  const p = new URL(r.url()).pathname;
  // O 404 do CEP inexistente é esperado -- é o caminho que estamos testando.
  if (r.status() >= 400 && !p.includes("favicon") && !p.startsWith("/cep/")) {
    problemas.push(`${r.status()} ${p}`);
  }
});

/** 🔴 Se alguém "simplificar" chamando o provedor de CEP direto do
 * navegador, aparece aqui -- e em produção o CSP bloquearia, porque
 * `viacep.com.br` não está no `connect-src` do `vercel.json`.
 *
 * ⚠️ A checagem é dos PROVEDORES, não de "qualquer host externo": as fontes
 * do Google saem em toda página e são permitidas pelo CSP (`style-src` e
 * `font-src`). Uma asserção de "nenhum host externo" acusa aquilo e não
 * prova nada sobre o CEP. */
const PROVEDORES_DE_CEP = ["viacep", "opencep", "brasilapi", "cepaberto", "widenet"];
const hostsExternos = new Set();
const provedoresChamadosDireto = new Set();
pagina.on("request", (r) => {
  const host = new URL(r.url()).host;
  if (host.startsWith("localhost")) return;
  hostsExternos.add(host);
  if (PROVEDORES_DE_CEP.some((p) => host.includes(p))) provedoresChamadosDireto.add(host);
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

await pagina.goto(APP, { waitUntil: "networkidle" });
await pagina.evaluate(() => localStorage.clear());
await pagina.goto(APP, { waitUntil: "networkidle" });
await pagina.getByLabel(/e-mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });

// --- cadastro: o CEP preenche o endereço --------------------------------
await pagina.goto(`${APP}/clientes`, { waitUntil: "networkidle" });
await pagina.getByRole("button", { name: /Novo cliente/i }).click();
await pagina.locator("#nome-cliente").fill("Cliente do roteiro");

const campoCep = pagina.locator("#cep-cliente");
await campoCep.fill("3013001");
await pagina.waitForTimeout(600);
conferir(
  (await pagina.locator("#logradouro-cliente").inputValue()) === "",
  "🔴 com 7 dígitos não consulta nada -- a guarda que dispensa o debounce",
);

await campoCep.fill("30130-010");
await pagina.locator("#logradouro-cliente").filter({ hasNot: pagina.locator("[value='']") }).first()
  .waitFor({ timeout: 15000 }).catch(() => {});
await pagina.waitForFunction(
  () => document.querySelector("#logradouro-cliente")?.value?.length > 0,
  { timeout: 15000 },
);

const preenchido = {
  logradouro: await pagina.locator("#logradouro-cliente").inputValue(),
  bairro: await pagina.locator("#bairro-cliente").inputValue(),
  cidade: await pagina.locator("#cidade-cliente").inputValue(),
  numero: await pagina.locator("#numero-cliente").inputValue(),
  complemento: await pagina.locator("#complemento-cliente").inputValue(),
  cepNaTela: await campoCep.inputValue(),
};
conferir(preenchido.logradouro === "Praça Sete de Setembro", "logradouro veio do provedor", preenchido.logradouro);
conferir(preenchido.bairro === "Centro", "bairro veio", preenchido.bairro);
conferir(preenchido.cidade === "Belo Horizonte", "cidade veio (`localidade` traduzido)", preenchido.cidade);
conferir(preenchido.cepNaTela === "30130-010", "o CEP fica mascarado na tela", preenchido.cepNaTela);
conferir(preenchido.numero === "", "🔴 Número NÃO vem preenchido -- a consulta não o traz");
conferir(
  preenchido.complemento === "",
  "🔴 Complemento NÃO vem preenchido -- lá é faixa de numeração, não endereço",
);

const focado = await pagina.evaluate(() => document.activeElement?.id);
conferir(focado === "numero-cliente", "🔴 o foco foi pro Número", `foco em ${focado}`);

/* UF: o seletor do projeto, com opção vazia.
   ⚠️ Clicar em `#uf-cliente` NÃO abre o painel: o react-select põe esse id
   num input escondido de 1px de altura (medido: top 773, bottom 774), e o
   Playwright recusa clicar nele por instabilidade. Quem abre é o CONTROLE
   visível, que é o pai desse input. */
await pagina.locator("#uf-cliente").locator("xpath=ancestor::*[contains(@class,'control')][1]").click();
const opcoes = await pagina.locator("[class*='option']").allInnerTexts();
conferir(opcoes.length === 28, "UF oferece as 27 + 'Nenhuma'", `${opcoes.length} opções`);
conferir(
  opcoes.some((o) => o.trim() === "Nenhuma"),
  "🔴 tem opção vazia -- o Select não é clearable, e sem ela não se volta atrás",
);
await pagina.keyboard.press("Escape");

// --- grava, e o endereço volta ------------------------------------------
await pagina.locator("#numero-cliente").fill("S/N");
await pagina.locator("#complemento-cliente").fill("Sala 302");
await pagina.getByRole("button", { name: /Cadastrar/ }).click();
await pagina.getByText("Cliente do roteiro").first().waitFor({ timeout: 15000 });
await pagina.getByText("Cliente do roteiro").first().click();
await pagina.locator("#cep-cliente-edicao").waitFor({ timeout: 15000 });

const gravado = {
  cep: await pagina.locator("#cep-cliente-edicao").inputValue(),
  logradouro: await pagina.locator("#logradouro-cliente-edicao").inputValue(),
  numero: await pagina.locator("#numero-cliente-edicao").inputValue(),
  complemento: await pagina.locator("#complemento-cliente-edicao").inputValue(),
  cidade: await pagina.locator("#cidade-cliente-edicao").inputValue(),
};
conferir(gravado.cep === "30130-010", "🔴 a máscara volta na edição", gravado.cep);
conferir(gravado.logradouro === "Praça Sete de Setembro", "logradouro sobreviveu ao banco");
conferir(gravado.numero === "S/N", "🔴 'S/N' gravou -- o campo é TEXTO", gravado.numero);
conferir(gravado.complemento === "Sala 302", "complemento digitado à mão sobreviveu");
conferir(gravado.cidade === "Belo Horizonte", "cidade sobreviveu");

// --- CEP que não existe --------------------------------------------------
const cepEdicao = pagina.locator("#cep-cliente-edicao");
await cepEdicao.fill(CEP_INEXISTENTE);
const avisoNaoAchou = await pagina
  .getByText(/CEP não encontrado/)
  .waitFor({ timeout: 15000 })
  .then(() => true)
  .catch(() => false);
conferir(avisoNaoAchou, "🔴 CEP inexistente avisa 'preencha à mão', e não trava a tela");
conferir(
  (await pagina.locator("#cidade-cliente-edicao").inputValue()) === "Belo Horizonte",
  "o aviso não apagou o que já estava preenchido",
);

// --- e o CSP ------------------------------------------------------------
conferir(
  provedoresChamadosDireto.size === 0,
  "🔴 o navegador NÃO falou com provedor de CEP -- a consulta passa pela nossa API",
  `hosts externos vistos: ${[...hostsExternos].join(", ") || "nenhum"}`,
);
conferir(problemas.length === 0, "nenhum erro de página nem resposta >= 400 inesperada", problemas.join(" | "));

const falhas = checagens.filter((c) => !c.ok);
console.log(`\n${falhas.length ? `❌ ${falhas.length} falha(s)` : `✅ ${checagens.length} checagens, todas passaram`}`);
await navegador.close();
process.exit(falhas.length ? 1 : 0);
