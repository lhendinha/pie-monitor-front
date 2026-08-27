/** O botão "Adicionar tarefa" no Histórico de PRODUÇÃO.
 *
 *   node scripts/verificar-botao-de-tarefa-em-producao.mjs
 *
 * 🔴 A pergunta não é "o botão aparece?" -- é "ele aparece exatamente nos
 * itens em que DEVE aparecer?". Por isso o roteiro lê o dado antes: pega
 * `GET /historico` com o token da sessão, calcula quais itens deveriam
 * mostrar o botão, e só então abre cada um pra conferir.
 *
 * Um roteiro que só abrisse o primeiro item passaria em silêncio nos dois
 * casos que importam -- lembrete de tarefa e envio sem `subgrupos_notificados`.
 *
 * 🔴 UMA tentativa de login: a conta bloqueia em 5.
 *
 * ⚠️ Nada de dado de pessoa vai pro console: só o que decide a régua
 * (é lembrete? quantos subgrupos?).
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

/* 🔴 Nenhum erro sobe cru daqui.
 *
 * O log de falha do Playwright imprime o NOME ACESSÍVEL dos elementos que
 * casaram -- e na lista do Histórico esse nome carrega o assunto do e-mail e
 * o endereço de quem recebeu. Uma execução com seletor ambíguo despejou
 * e-mails de gente de verdade no console. */
process.on("uncaughtException", (e) => {
  console.error(`\n❌ o roteiro quebrou: ${e.message.split("\n")[0].slice(0, 160)}`);
  process.exit(1);
});

const APP = "https://argos-monitor.vercel.app";
const QUANTOS_ABRIR = 6;

function credenciais() {
  let bruto;
  try {
    bruto = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("Faltou o .env.local com PJE_TEST_EMAIL e PJE_TEST_SENHA.");
    process.exit(1);
  }
  const pega = (k) => bruto.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
  const email = pega("PJE_TEST_EMAIL");
  const senha = pega("PJE_TEST_SENHA");
  if (!email || !senha) {
    console.error("O .env.local não traz PJE_TEST_EMAIL e PJE_TEST_SENHA.");
    process.exit(1);
  }
  return { email, senha };
}

const CONTA = credenciais();
const navegador = await chromium.launch({ channel: "chrome", headless: false });
const pagina = await (await navegador.newContext({ viewport: { width: 1500, height: 980 } })).newPage();

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
const entrou = await pagina.getByText("Resumo rápido").waitFor({ timeout: 25_000 })
  .then(() => true).catch(() => false);
if (!entrou) {
  /* 🔴 PARA aqui, sem retry: são 5 tentativas até o bloqueio. */
  console.error("\nO login não passou. PARANDO -- a conta bloqueia em 5 tentativas.");
  await navegador.close();
  process.exit(1);
}
console.log("entrou\n");

// ── o dado, antes da tela ────────────────────────────────────────────────
const base = await pagina.evaluate(
  () =>
    performance.getEntriesByType("resource").map((e) => e.name)
      .find((n) => n.includes("lambda-url"))?.split("/").slice(0, 3).join("/") ?? null,
);
const chave = await pagina.evaluate(
  () => Object.keys(localStorage).find((k) => k.toLowerCase().includes("access")) ?? null,
);

/** Pede à API a MESMA lista que a tela está mostrando.
 *
 * 🔴 A primeira versão deste roteiro pediu sem filtro e casou os itens por
 * índice com os da tela -- e a tela abre filtrada em `movimentacao`
 * (`TIPO_DE_ENVIO_PADRAO`, porque "lembrete é diário e dominaria a lista").
 * Resultado: cinco "falhas" que eram do roteiro, e que teriam sido
 * reportadas como defeito do botão.
 */
async function lerHistorico(tipoEnvio) {
  return pagina.evaluate(
    async ([b, c, tipo]) => {
      const r = await fetch(`${b}/historico?pagina=1&tamanho_pagina=10&tipo_envio=${tipo}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(c)}` },
      });
      return r.ok ? r.json() : { erro: r.status };
    },
    [base, chave, tipoEnvio],
  );
}

/** A régua, repetida aqui de propósito: se ela divergir da tela, uma das
 * duas está errada -- e é isso que este roteiro existe pra descobrir. */
const deveriaMostrar = (item) =>
  !item.tarefa_id && (item.subgrupos_notificados?.length ?? 0) === 1;

const linhas = () =>
  pagina.locator('[role="button"]').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });

/** Troca a pílula de tipo de envio.
 *
 * ⚠️ Pelo TRIGGER do menu (`.chakra-menu__trigger`), não por
 * `getByRole("button", {name: /Lembrete/})`: os itens da lista são
 * `role="button"` e o nome acessível deles carrega o assunto do e-mail --
 * um match por texto resolvia para 11 elementos. */
async function trocarFiltroPara(rotulo) {
  /* ⚠️ E o trigger é escolhido pelo TEXTO dele, não por `.first()`: são três
     pílulas (tipo, falha, período) e a ordem no DOM não é contrato. A de
     tipo é a única que mostra "Movimentações" ou "Lembretes". */
  await pagina
    .locator(".chakra-menu__trigger")
    .filter({ hasText: /Movimenta|Lembrete/ })
    .click();
  await pagina.getByRole("menuitem", { name: rotulo, exact: true }).click();
  await pagina.waitForTimeout(2500);
}

/** Abre os N primeiros itens da tela e confere o botão contra o dado. */
async function conferirAba(rotuloDoFiltro, tipoEnvio) {
  console.log(`\n── filtro "${rotuloDoFiltro}" ${"─".repeat(Math.max(0, 40 - rotuloDoFiltro.length))}`);

  const dados = await lerHistorico(tipoEnvio);
  if (dados.erro) {
    conferir(false, `leu GET /historico?tipo_envio=${tipoEnvio}`, `HTTP ${dados.erro}`);
    return;
  }
  const itens = dados.historico ?? [];
  const naTela = await linhas().count();
  conferir(
    naTela === itens.length,
    `a tela mostra os mesmos ${itens.length} itens que a API devolve`,
    `tela: ${naTela}`,
  );
  if (naTela !== itens.length) return; // sem correspondência, não dá pra casar

  const quantos = Math.min(QUANTOS_ABRIR, naTela);
  for (let i = 0; i < quantos; i++) {
    await linhas().nth(i).click();
    await pagina.getByText("Detalhes do envio").waitFor({ timeout: 15_000 });
    await pagina.waitForTimeout(400);
    const temBotao = await pagina
      .getByRole("button", { name: /Adicionar tarefa/ })
      .isVisible()
      .catch(() => false);

    const item = itens[i];
    const esperado = deveriaMostrar(item);
    const caso = item.tarefa_id
      ? "lembrete de tarefa"
      : item.subgrupos_notificados === undefined
        ? "sem `subgrupos_notificados`"
        : `${item.subgrupos_notificados.length} subgrupo(s)`;

    conferir(
      temBotao === esperado,
      `item ${i + 1} (${caso}): botão ${esperado ? "aparece" : "NÃO aparece"}`,
      temBotao === esperado ? "" : `a tela mostrou ${temBotao ? "sim" : "não"}`,
    );

    await pagina.keyboard.press("Escape");
    await pagina.waitForTimeout(300);
  }
  return itens;
}

await pagina.goto(`${APP}/historico`, { waitUntil: "networkidle" });

// 1. como a tela abre: movimentações -- onde o botão DEVE aparecer
const movimentacoes = await conferirAba("Movimentações (padrão)", "movimentacao");

// 2. lembretes -- o caso negativo, e é o que só produção tem em quantidade
await trocarFiltroPara("Lembretes");
await conferirAba("Lembretes", "lembrete");

// 3. o caminho completo, num item que mostra o botão
if (movimentacoes?.some(deveriaMostrar)) {
  console.log("\n── o caminho completo ──────────────────────────────");
  await trocarFiltroPara("Movimentações");

  const idx = movimentacoes.findIndex(deveriaMostrar);
  await linhas().nth(idx).click();
  await pagina.getByText("Detalhes do envio").waitFor({ timeout: 15_000 });
  await pagina.getByRole("button", { name: /Adicionar tarefa/ }).click();
  const abriu = await pagina.getByText("Nova tarefa").waitFor({ timeout: 15_000 })
    .then(() => true).catch(() => false);
  conferir(abriu, "o formulário de tarefa abre");
  if (abriu) {
    const modalDaTarefa = pagina.locator("[role=dialog]").filter({ hasText: "Nova tarefa" });
    const temVinculo = await modalDaTarefa.locator("text=/\\d{7}-\\d{2}\\./").first()
      .waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
    conferir(temVinculo, "abre com o processo já vinculado");
    conferir(
      await pagina.getByText("Detalhes do envio").isVisible(),
      "e o modal de detalhes continua aberto",
    );
    // ⚠️ NÃO salva: isto é produção, e o roteiro não cria dado de ninguém.
    await pagina.keyboard.press("Escape");
  }
}

const falhas = checagens.filter((c) => !c.ok);
console.log(
  `\n${falhas.length ? `❌ ${falhas.length} de ${checagens.length} falharam` : `✅ ${checagens.length} checagens, todas passaram`}`,
);
await navegador.close();
process.exit(falhas.length ? 1 : 0);
