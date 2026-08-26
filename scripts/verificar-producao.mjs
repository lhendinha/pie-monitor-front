/** O caminho completo de Documentos, contra PRODUÇÃO.
 *
 *   node scripts/verificar-producao.mjs
 *
 * 🔴 **Roda contra `argos-monitor.vercel.app` e escreve dados de verdade.**
 * É o único teste que prova o que nem o `yarn offline` nem o Chrome local
 * alcançam: o envio real atravessando o CSP e o CORS do bucket, com IAM,
 * SigV4 e a política do S3 todos valendo ao mesmo tempo.
 *
 * As credenciais vêm de `.env.local` (`PJE_TEST_EMAIL` / `PJE_TEST_SENHA`),
 * que é gitignorado. **Nada é impresso** -- nem o e-mail.
 *
 * 🔴 **Se o login falhar, o script PARA na hora e não tenta de novo.**
 * `auth_service` bloqueia a conta em 5 tentativas, e um laço de retry aqui
 * queimaria as cinco em segundos. Uma sessão já chegou a três tentativas
 * queimadas por causa de um payload montado à mão -- é por isso que o login
 * aqui é feito PELA TELA: quem monta o corpo é o próprio front, que já sabe
 * que o campo é `password` e não `senha`.
 *
 * ⚠️ O documento criado é apagado no `finally`, inclusive se algo estourar no
 * meio. O que sobrar carrega "VERIFICACAO AUTOMATICA" no título.
 */
import { chromium } from "playwright";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = "https://argos-monitor.vercel.app";

/** Lê `.env.local` sem despejar o conteúdo em lugar nenhum. */
function credenciais() {
  let bruto;
  try {
    bruto = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error(
      "Faltou o .env.local com PJE_TEST_EMAIL e PJE_TEST_SENHA " +
        "(gitignorado -- ver o README).",
    );
    process.exit(1);
  }
  const pega = (chave) => bruto.match(new RegExp(`^${chave}=(.*)$`, "m"))?.[1]?.trim();
  const email = pega("PJE_TEST_EMAIL");
  const senha = pega("PJE_TEST_SENHA");
  if (!email || !senha) {
    console.error("O .env.local existe mas não traz PJE_TEST_EMAIL e PJE_TEST_SENHA.");
    process.exit(1);
  }
  return { email, senha };
}

const CONTA = credenciais();
const MARCA = "VERIFICACAO AUTOMATICA";
const TITULO = `${MARCA} -- pode apagar`;

const PASTA = mkdtempSync(join(tmpdir(), "argos-prod-"));
const ARQUIVO = join(PASTA, "verificacao-automatica.pdf");
writeFileSync(
  ARQUIVO,
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 30 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
const pagina = await contexto.newPage();

/** Respostas de erro e violações de CSP -- é onde o envio quebraria. */
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("console", (m) => {
  const t = m.text();
  if (/Content Security Policy|CORS|blocked/i.test(t)) problemas.push(`console: ${t.slice(0, 160)}`);
});
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("favicon")) {
    problemas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  }
});

let criado = false;

try {
  // ───────────────────────────── login, UMA tentativa
  await pagina.goto(APP);
  await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
  await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();

  const entrou = await pagina
    .getByText("Resumo rápido")
    .waitFor({ timeout: 25_000 })
    .then(() => true)
    .catch(() => false);

  if (!entrou) {
    /* 🔴 PARA aqui. Sem retry, sem laço: são 5 tentativas até o bloqueio. */
    console.error(
      "\nO login não passou. O script PARA aqui de propósito -- a conta " +
        "bloqueia em 5 tentativas.\nConfira PJE_TEST_EMAIL/PJE_TEST_SENHA no " +
        ".env.local antes de rodar de novo.",
    );
    await navegador.close();
    process.exit(1);
  }
  console.log("entrou\n");

  // ───────────────────────────── a tela existe
  console.log("— a tela nova está publicada —");
  await pagina.getByRole("link", { name: "Documentos" }).click();
  await pagina.getByRole("heading", { name: "Documentos" }).waitFor({ timeout: 20_000 });
  conferir(true, "Documentos está no menu e a tela abre");

  // ───────────────────────────── 🔴 o envio real
  console.log("\n— o envio, atravessando CSP e CORS de verdade —");
  await pagina.getByRole("button", { name: /Adicionar documento/ }).click();
  await pagina.getByRole("dialog").waitFor();
  await pagina.locator('input[type="file"]').setInputFiles(ARQUIVO);
  await pagina.getByLabel(/^Título/).fill(TITULO);
  await pagina
    .getByLabel(/^Descrição/)
    .fill("Criado por scripts/verificar-producao.mjs. Apagado no fim do roteiro.");
  await pagina.getByRole("button", { name: /^Salvar$/ }).click();

  const apareceu = await pagina
    .getByText(TITULO)
    .first()
    .waitFor({ timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  criado = apareceu;
  conferir(apareceu, "🔴 o arquivo SUBIU pro S3 e o documento apareceu na lista");
  if (!apareceu) throw new Error("o envio não completou -- ver os problemas no fim");

  // ───────────────────────────── a tela do documento
  console.log("\n— a tela do documento —");
  await pagina.getByText(TITULO).first().click();
  await pagina.getByRole("heading", { name: TITULO }).waitFor({ timeout: 20_000 });
  const urlDoDoc = pagina.url();
  conferir(/\/documentos\/[^/]+\/[^/]+$/.test(urlDoDoc), "clicar na linha abre a tela do documento");

  await pagina.reload();
  await pagina.getByRole("heading", { name: TITULO }).waitFor({ timeout: 20_000 });
  conferir(
    (await pagina.getByLabel(/^Título/).inputValue()) === TITULO,
    "🔴 F5 em produção hidrata a tela sozinha",
  );

  // ───────────────────────────── o download assinado
  console.log("\n— o download —");
  const baixando = pagina.waitForEvent("download", { timeout: 30_000 });
  await pagina.getByRole("button", { name: /^Baixar$/ }).click();
  const baixado = await baixando;
  conferir(
    baixado.suggestedFilename() === "verificacao-automatica.pdf",
    "🔴 baixa com o NOME ORIGINAL, pela URL assinada",
    baixado.suggestedFilename(),
  );

  // ───────────────────────────── as cores novas
  console.log("\n— o âmbar novo, em produção —");
  /* 🔴 Medido na FAIXA do diálogo de exclusão, não na etiqueta de
   * atendimento.
   *
   * A etiqueta seria o alvo óbvio, mas depende de a conta ter um atendimento
   * em andamento -- e sem ele o script imprimia "nada a medir" e passava com
   * uma checagem a menos, em silêncio. É o mesmo defeito de teste que já
   * mordeu o roteiro local: checagem que não roda não prova nada.
   *
   * A faixa usa o MESMO token (`status.warn.text`) e aparece num diálogo que
   * este roteiro já precisa abrir pra limpar o que criou. Sem dado extra,
   * sem escrita a mais em produção, e sempre presente. */
  await pagina.goto(APP + "/documentos");
  await pagina.getByText(TITULO).first().click();
  await pagina.getByRole("heading", { name: TITULO }).waitFor({ timeout: 20_000 });
  await pagina.getByRole("button", { name: /Excluir/ }).click();
  const aviso = pagina.getByText(/não pode ser recuperado/);
  await aviso.waitFor({ timeout: 15_000 });
  const medida = await aviso.evaluate((e) => {
    const s = getComputedStyle(e);
    return { cor: s.color, fundo: s.backgroundColor };
  });
  conferir(
    medida.cor === "rgb(153, 93, 0)",
    "🔴 o âmbar novo chegou em produção com a COR certa",
    `${medida.cor} sobre ${medida.fundo}`,
  );
  // Fecha o diálogo -- a limpeza abaixo o reabre pelo caminho normal.
  await pagina.keyboard.press("Escape");
} finally {
  // ───────────────────────────── limpeza, aconteça o que acontecer
  if (criado) {
    console.log("\n— limpeza —");
    try {
      await pagina.goto(APP + "/documentos");
      await pagina.getByText(TITULO).first().click();
      await pagina.getByRole("heading", { name: TITULO }).waitFor({ timeout: 20_000 });
      await pagina.getByRole("button", { name: /Excluir/ }).click();
      const dialogo = pagina.getByRole("dialog");
      await dialogo.waitFor();
      await dialogo.getByRole("button", { name: /Excluir/ }).click();
      await pagina.getByRole("heading", { name: "Documentos" }).waitFor({ timeout: 20_000 });
      await pagina.waitForTimeout(1500);
      conferir(
        (await pagina.getByText(TITULO).count()) === 0,
        "🔴 o documento de teste foi apagado de produção",
      );
    } catch (e) {
      conferir(false, "a limpeza FALHOU", `apague à mão o documento "${TITULO}"`);
      console.error(String(e).slice(0, 200));
    }
  }

  console.log("\n" + "─".repeat(64));
  if (problemas.length) {
    console.log("respostas de erro / CSP / CORS durante o roteiro:");
    [...new Set(problemas)].forEach((p) => console.log(`  ! ${p}`));
  }
  const falhas = checagens.filter((c) => !c.ok);
  console.log(`${checagens.length - falhas.length}/${checagens.length} checagens passaram`);
  await navegador.close();
  process.exit(falhas.length || problemas.length ? 1 : 0);
}
