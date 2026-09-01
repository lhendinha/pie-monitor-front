/** A cadeia INTEIRA da Etapa 4, em PRODUÇÃO -- da tela até o tribunal.
 *
 *   cd ../api && python scripts/e2e_grupo_de_teste.py criar
 *   node scripts/verificar-carga-ponta-a-ponta.mjs
 *   cd ../api && python scripts/e2e_grupo_de_teste.py remover
 *
 * 🔴 **A pergunta é uma só, e nenhum teste anterior a responde**: uma OAB
 * cadastrada PELA TELA nova chega até a carga histórica? Cada elo já tem prova
 * própria -- a tela em jsdom, a carga em `tests/test_carga_historica.py`, o
 * fatiamento contra o PJe --, e é justamente por isso que a EMENDA entre eles
 * não tem nenhuma. Foi o que a Etapa 4 existiu para fechar: até ela, a carga só
 * alcançava as inscrições ligadas pelo PERFIL.
 *
 * 🔴 **Num grupo de teste, e não num de cliente.** Provar isto num grupo real
 * criaria processos no sistema de quem paga por ele. Ver
 * `api/scripts/e2e_grupo_de_teste.py`, que também explica as DUAS garantias de
 * zero e-mail -- o SES desta conta está fora do sandbox, e mensagem para
 * endereço inventado quica.
 *
 * ⚠️ **A conta é a do grupo de teste, não a `PJE_TEST_*`.** Aquela é de um
 * grupo com dado real e bloqueia em 5 tentativas; esta é descartável, e o
 * roteiro pode ser rodado de novo sem gastar tentativa de ninguém.
 *
 * ⚠️ Nada de dado de pessoa vai ao console -- só números e o que decide cada
 * afirmação.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

/* 🔴 Nenhum erro sobe cru: o log de falha do Playwright imprime o nome
   acessível dos elementos que casaram, e numa lista de processos isso carrega
   número de processo e apelido. */
process.on("uncaughtException", (e) => {
  console.error(`\n❌ o roteiro quebrou: ${e.message.split("\n")[0].slice(0, 180)}`);
  process.exit(1);
});

const APP = "https://argos-monitor.vercel.app";
const CONTA = { email: "e2e-carga@argos.invalid", senha: "SenhaE2E!2026" };
const OAB = { numero: "206876", uf: "MG" };
const DESTINO = "Destino (sem membros)";
const GRUPO = "e2e-carga-avulsa";
/* ⚠️ `--profile`, e não `AWS_PROFILE`: é a régua do projeto para o `aws` CLI. */
const PERFIL = "programmer-beyond-it";

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome, detalhe });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 40 });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1500, height: 1000 } })
).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login")) {
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  }
});

// ── 1. entrar, no grupo de teste ──────────────────────────────────────────
await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor({ timeout: 30_000 });
conferir(true, "entrou no grupo de teste, em produção");

// ── 2. cadastrar a OAB PELA TELA, ligada ──────────────────────────────────
await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
await pagina.getByText("Inscrições da OAB").waitFor();
conferir(true, "a aba nova existe em produção");

await pagina.getByRole("button", { name: "Adicionar inscrição" }).click();
await pagina.getByRole("heading", { name: "Adicionar inscrição" }).waitFor();
await pagina.getByLabel(/Número/).fill(OAB.numero);
await pagina.getByLabel(/^UF/).click();
await pagina.getByText(OAB.uf, { exact: true }).last().click();
/* ⚠️ O clique vai no RÓTULO: o Chakra v3 esconde o input e desenha o trilho
   por cima, que intercepta o ponteiro. Medido -- clicar no input dá timeout. */
await pagina.getByText("Cadastrar sozinho os processos desta inscrição").click();
await pagina.getByLabel(/Subgrupos de destino/).click();
await pagina.getByText(DESTINO, { exact: true }).click();
await pagina.keyboard.press("Escape");

/* 🔴 O servidor consulta o PJe para validar a inscrição NOVA (~0,5s), e é
   consulta a terceiro: o tempo aqui não é folga, é a chamada real. */
await pagina.getByRole("button", { name: "Adicionar", exact: true }).click();
await pagina
  .locator(`[id="inscricao-${OAB.numero}/${OAB.uf}"]`)
  .waitFor({ timeout: 60_000 });
conferir(true, "🔴 a OAB foi cadastrada PELA TELA e o tribunal a reconheceu");

const naTela = await pagina.evaluate((alvo) => {
  const tr = document
    .querySelector(`[id="inscricao-${alvo}"]`)
    ?.closest("tr");
  const tds = tr ? [...tr.querySelectorAll("td")] : [];
  return { interruptor: tds[1]?.textContent?.trim(), destinos: tds[2]?.textContent?.trim() };
}, `${OAB.numero}/${OAB.uf}`);
conferir(naTela.interruptor === "Ligada", "com a importação LIGADA", naTela.interruptor);
conferir(naTela.destinos === DESTINO, "e o destino gravado", naTela.destinos);

await pagina.screenshot({ path: "/tmp/e2e-1-cadastrada.png" });
await navegador.close();

// ── 3. disparar a carga SÓ para este grupo ────────────────────────────────
/* 🔴 É aqui que `grupo_id` deixa de ser detalhe e vira a peça: sem ele a carga
   rodaria para TODOS os grupos, inclusive os de cliente. Ele existe exatamente
   para isto -- rodar a execução mais cara do sistema em produção, contida a um
   grupo descartável. */
console.log("\ndisparando a carga para o grupo de teste…");
const bruto = execFileSync("aws", [
  "lambda", "invoke",
  "--function-name", "pje-monitor-prod-carga",
  "--profile", PERFIL, "--region", "sa-east-1",
  "--payload", JSON.stringify({ grupo_id: GRUPO }),
  "--cli-binary-format", "raw-in-base64-out",
  "/tmp/carga-e2e.json",
], { encoding: "utf8" });
const invocacao = JSON.parse(bruto);
conferir(invocacao.StatusCode === 200, "a Lambda respondeu 200", `StatusCode=${invocacao.StatusCode}`);
/* ⚠️ `FunctionError` é o campo que separa "a Lambda rodou" de "a Lambda rodou
   e a função levantou". Sem ele, um traceback devolvido com StatusCode 200
   passaria por sucesso -- que é como um erro de carga chega. */
conferir(!invocacao.FunctionError, "e a função não levantou", invocacao.FunctionError || "");

const carga = JSON.parse(readFileSync("/tmp/carga-e2e.json", "utf8"));
console.log("       carga:", JSON.stringify(carga));
conferir(
  carga.inscricoes_carregadas === 1,
  "🔴 a carga ALCANÇOU a inscrição cadastrada pela tela",
  `inscricoes_carregadas=${carga.inscricoes_carregadas}`,
);
conferir(
  carga.grupos_vistos === 1,
  "e ficou contida no grupo de teste",
  `grupos_vistos=${carga.grupos_vistos}`,
);
conferir(carga.fatias > 0, "o fatiamento por data rodou", `fatias=${carga.fatias}`);
conferir(
  carga.cortada_pelo_relogio === false,
  "e o relógio não cortou -- a carga terminou o que tinha",
);

// ── 4. o que ficou GRAVADO ────────────────────────────────────────────────
const noBanco = JSON.parse(
  execFileSync(
    "../api/.venv/bin/python",
    ["scripts/e2e_grupo_de_teste.py", "conferir", "--json"],
    { encoding: "utf8", cwd: "../api" },
  ),
);
console.log("       banco:", JSON.stringify(noBanco));
conferir(noBanco.processos > 0, "processos foram criados no grupo", `${noBanco.processos}`);
/* 🔴 O RELÓGIO da carga, e ele prova coisa DIFERENTE de "criou processo":
   `desde` diz até onde ela foi para trás. Sem ele, a próxima execução
   recomeçaria do zero e a cobertura seria uma afirmação sem lastro. */
conferir(
  Boolean(noBanco.importacoes?.[`${OAB.numero}/${OAB.uf}`]?.desde),
  "🔴 e o relógio da carga registrou até onde foi",
  JSON.stringify(noBanco.importacoes),
);

// ── 5. 🔴 a afirmação de segurança ────────────────────────────────────────
conferir(
  noBanco.emails_com_destinatario === 0,
  "🔴 ZERO e-mails saíram -- o subgrupo de destino não tem membros",
  `${noBanco.registros_de_email} registros, ${noBanco.emails_com_destinatario} com destinatário`,
);

console.log("\n" + "─".repeat(64));
for (const p of problemas) console.log(`⚠️  ${p}`);
const falhas = checagens.filter((c) => !c.ok);
console.log(`${checagens.length - falhas.length}/${checagens.length} checagens ok`);
if (falhas.length) console.log("FALHAS: " + falhas.map((f) => f.nome).join(" | "));
console.log(
  "\n➡️  Para desmontar: cd ../api && python scripts/e2e_grupo_de_teste.py remover",
);
process.exit(falhas.length || problemas.length ? 1 : 0);
