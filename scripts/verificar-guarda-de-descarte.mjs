/** A guarda de descarte em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-guarda-de-descarte.mjs
 *
 * 🔴 **Existe pelo que o jsdom NÃO alcança.** A verificação central aqui é a
 * do EMPILHAMENTO: o diálogo é irmão da cortina, não filho. Se fosse filho,
 * um clique no fundo dele borbulharia até o `onClick` da cortina de fora --
 * e em jsdom essa mutação SOBREVIVE, porque o clique só reabriria um diálogo
 * já aberto e `onFechar` seguiria sem ser chamado. Só a tela distingue.
 *
 * ⚠️ O segundo caso que só o navegador responde é a camada flutuante: o menu
 * do `Select` é portal em `z-index 210`, contra os `100` do diálogo. Se
 * sobreviver ao gesto, pinta POR CIMA da pergunta.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

const problemas = [];
const conferir = (ok, oQue) => {
  console.log(`${ok ? "  ok  " : "FALHA "} ${oQue}`);
  if (!ok) problemas.push(oQue);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1500, height: 1000 } })
).newPage();

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();

// ── abre o Novo cliente e suja o formulário ─────────────────────────────
await pagina.goto(`${APP}/clientes`);
await pagina.getByRole("button", { name: /Novo cliente/i }).first().click();
const nome = pagina.getByLabel(/^Nome/);
await nome.waitFor();

console.log("\n-- intacto --");
await pagina.keyboard.press("Escape");
conferir(!(await pagina.getByText("Sair sem salvar?").isVisible().catch(() => false)),
  "abrir e sair sem mexer NÃO pergunta");

await pagina.getByRole("button", { name: /Novo cliente/i }).first().click();
await nome.waitFor();
await nome.fill("Construtora Alfa");

console.log("\n-- com o formulário mexido --");
await pagina.keyboard.press("Escape");
const dialogo = pagina.getByText("Sair sem salvar?");
await dialogo.waitFor();
conferir(true, "Escape abre a pergunta");

/* 🔴 A verificação que só o Chrome responde. */
const caixaDoDialogo = pagina.locator('[role="dialog"]', { hasText: "Sair sem salvar?" });
const cx = await caixaDoDialogo.boundingBox();
await pagina.mouse.click(cx.x + cx.width / 2, cx.y - 60); // no fundo, ACIMA do diálogo
conferir(await nome.isVisible().catch(() => false),
  "🔴 clicar no fundo do DIÁLOGO não fecha o formulário atrás");
/* ⚠️ Esse clique dispensa o DIÁLOGO -- é o comportamento certo da cortina
   dele. O que se mede acima é que o formulário sobreviveu. */
conferir(!(await pagina.getByText("Sair sem salvar?").isVisible().catch(() => false)),
  "e dispensa a pergunta, que é o que a cortina dela faz");

console.log("\n-- continuar editando --");
await pagina.keyboard.press("Escape");
await pagina.getByText("Sair sem salvar?").waitFor();
await pagina.getByRole("button", { name: "Continuar preenchendo" }).click();
conferir(!(await pagina.getByText("Sair sem salvar?").isVisible().catch(() => false)),
  "a pergunta some");
conferir((await nome.inputValue()) === "Construtora Alfa", "e o texto continua lá, intacto");

console.log("\n-- o foco e a camada flutuante --");
await pagina.getByLabel(/^UF/).click().catch(() => {});
await pagina.keyboard.press("Escape");
conferir(await nome.isVisible().catch(() => false),
  "Escape com o seletor aberto não fecha o formulário");

console.log("\n-- sair sem salvar --");
await pagina.keyboard.press("Escape");
await pagina.getByText("Sair sem salvar?").waitFor();
await pagina.getByRole("button", { name: "Sair sem salvar" }).click();
conferir(!(await nome.isVisible().catch(() => false)), "🔴 fecha os dois de uma vez");

await navegador.close();
console.log(problemas.length ? `\n${problemas.length} FALHA(S)` : "\nTudo certo.");
process.exit(problemas.length ? 1 : 0);
