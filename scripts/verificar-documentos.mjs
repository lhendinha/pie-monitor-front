/** Documentos, de ponta a ponta -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_abas.py
 *      .venv/bin/python scripts/offline/semear_documentos.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-documentos.mjs
 *
 * 🔴 **O que só Chrome responde, e jsdom não:**
 *
 * - o arquivo sai mesmo da máquina e chega no armazenamento (`FormData` com
 *   o boundary que o navegador gera -- em jsdom o `fetch` é um dublê);
 * - o `<input type="file">` escondido continua alcançável e o diálogo nativo
 *   abre pelo rótulo;
 * - o painel de aba escondido some do FOCO, e não só do texto;
 * - o download dispara sem trocar a página de baixo.
 *
 * ⚠️ **E o que NEM ISTO prova**, porque não é a AWS: a recusa dos 20 MB pelo
 * S3 (o `content-length-range` do MinIO não é o da AWS), o
 * Intelligent-Tiering, o CSP (`vercel.json` só vale em produção) e a
 * assinatura SigV4 (o MinIO aceita SigV2 também). Esses quatro são conferidos
 * depois do deploy -- ver `api/CONTEXT.md`.
 */
import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

/* 🔴 A conta do CASO NEGATIVO, e ela não é a de cima.
 *
 * `chefe@local.test` é `super_admin`, e `escopo_subgrupo.subgrupos_visiveis`
 * dá o GRUPO INTEIRO a `admin` pra cima -- com razão escrita lá: quem pode
 * agir em qualquer subgrupo tem que ver o que criou. Com ela, o documento do
 * subgrupo alheio aparece **de propósito**.
 *
 * Este roteiro afirmava o contrário e ficava verde, porque perguntava antes
 * de a lista carregar. Corrigido o timing, ele acusou -- e o defeito era do
 * teste, não do sistema. `colega@local.test` é `user`, membro de um subgrupo
 * só: é nela que a permissão se prova. */
const COLEGA = { email: "colega@local.test", senha: "Senha!Local1" };
const PROCESSO = "/processos/3bc2708f19ca/90000000000000000000";
const CLIENTE = "/clientes/cli-g-alfa";

/* 🔴 As fixtures são GERADAS, não versionadas.
 *
 * O `setFiles` do Playwright aponta pra um caminho em disco, então sem
 * arquivo o roteiro não roda em máquina limpa. Versionar resolveria -- e
 * poria binário no histórico pra sempre, incluindo um de 20 MB que ninguém
 * quer clonar. Gerados num diretório temporário, os dois nascem a cada
 * execução e somem com ela. */
const PASTA = mkdtempSync(join(tmpdir(), "argos-docs-"));
const PDF_PEQUENO = join(PASTA, "peticao-de-teste.pdf");
const ARQUIVO_GRANDE = join(PASTA, "grande-demais.pdf");

writeFileSync(
  PDF_PEQUENO,
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
// 20 MB + 1 byte: o primeiro tamanho que a tela tem que recusar.
writeFileSync(ARQUIVO_GRANDE, Buffer.alloc(20 * 1024 * 1024 + 1, 0x41));

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
const pagina = await contexto.newPage();

const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 120)}`));
pagina.on("response", (r) => {
  // O 404 do favicon não é defeito do sistema.
  if (r.status() >= 400 && !r.url().includes("favicon")) {
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  }
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome, detalhe });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();
console.log("entrou\n");

/** O painel que a aba comanda -- chega nele pelo `aria-controls`, que é a
 * ligação que some em silêncio quando quebra. */
async function painel(nome) {
  const id = await pagina.getByRole("tab", { name: nome }).getAttribute("aria-controls");
  if (!id) throw new Error(`a aba "${nome}" não declara aria-controls`);
  return pagina.locator(`#${id}`);
}

// ─────────────────────────────── a listagem
console.log("— listagem —");
await pagina.getByRole("link", { name: "Documentos" }).click();
await pagina.getByRole("heading", { name: "Documentos" }).waitFor();

/* 🔴 Espera a LISTA, não o cabeçalho.
 *
 * O cabeçalho "Documentos" aparece antes de a consulta voltar, e as
 * checagens abaixo rodavam contra uma tabela vazia: as positivas falhavam por
 * timing e -- pior -- a NEGATIVA passava por vacuidade. Um teste de permissão
 * que passa porque nada carregou é o teste mais perigoso que existe aqui:
 * ele fica verde exatamente quando deveria gritar. */
await pagina.getByText("peticao-inicial-assinada.pdf").waitFor({ timeout: 15_000 });

conferir(
  await pagina.getByText("peticao-inicial-assinada.pdf").isVisible(),
  "o documento semeado aparece",
);
conferir(
  await pagina.getByText("Certidão negativa — portal da Receita").isVisible(),
  "o LINK aparece junto dos arquivos",
);

/* Com `super_admin` o documento do subgrupo alheio DEVE aparecer -- é a
   régua de `subgrupos_visiveis`. Afirmar isso aqui é o que impede alguém
   "consertar" a permissão pro lado errado. */
conferir(
  (await pagina.getByText("NAO-DEVE-APARECER.pdf").count()) === 1,
  "super_admin enxerga o subgrupo alheio -- é assim que a régua funciona",
);

// ─────────────────── o caso NEGATIVO, na conta que o prova
console.log("\n— permissão, com uma conta `user` —");
{
  /* Contexto NOVO: sessão limpa, sem herdar o token do super_admin. Reusar a
     mesma aba faria o teste medir a sessão errada. */
  const outro = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
  const dele = await outro.newPage();
  await dele.goto(APP);
  await dele.getByLabel(/e-?mail/i).fill(COLEGA.email);
  await dele.getByRole("textbox", { name: "Senha" }).fill(COLEGA.senha);
  await dele.getByRole("button", { name: /entrar/i }).click();
  await dele.getByText("Resumo rápido").waitFor();

  await dele.goto(APP + "/documentos");
  // Espera a lista CHEGAR antes de afirmar ausência -- ver o comentário acima.
  await dele.getByText("peticao-inicial-assinada.pdf").waitFor({ timeout: 15_000 });

  conferir(
    (await dele.getByText("NAO-DEVE-APARECER.pdf").count()) === 0,
    "🔴 `user` NÃO enxerga o documento do subgrupo alheio",
  );
  await outro.close();
}

// ─────────────────────────────── a linha abre a tela
console.log("\n— abrir pela linha —");
await pagina.getByText("procuracao-ad-judicia.pdf").click();
await pagina.getByRole("heading", { name: "procuracao-ad-judicia.pdf" }).waitFor();
const urlDoDetalhe = pagina.url();
conferir(/\/documentos\/[^/]+\/[^/]+$/.test(urlDoDetalhe), "clicar na linha vai pra tela do documento", urlDoDetalhe);

// F5 ali: a tela é rota, tem que se hidratar sozinha.
await pagina.reload();
await pagina.getByRole("heading", { name: "procuracao-ad-judicia.pdf" }).waitFor();
conferir(
  await pagina.getByLabel(/^Título/).inputValue() === "procuracao-ad-judicia.pdf",
  "🔴 F5 na tela do documento a hidrata sozinha",
);

// ─────────────────────────────── baixar
console.log("\n— baixar —");
const baixando = pagina.waitForEvent("download", { timeout: 15_000 });
await pagina.getByRole("button", { name: /^Baixar$/ }).click();
const baixado = await baixando;
conferir(
  baixado.suggestedFilename() === "procuracao-ad-judicia.pdf",
  "🔴 baixa com o NOME ORIGINAL, não com a chave do objeto",
  baixado.suggestedFilename(),
);
conferir(
  await pagina.getByRole("heading", { name: "procuracao-ad-judicia.pdf" }).isVisible(),
  "e a tela de baixo continua onde estava",
);

// ─────────────────────────────── enviar de verdade
console.log("\n— enviar arquivo —");
await pagina.goto(APP + "/documentos");
await pagina.getByRole("button", { name: /Adicionar documento/ }).click();
await pagina.getByRole("dialog").waitFor();

// A recusa local, ANTES do envio: 20 MB + 1 byte.
await pagina.locator('input[type="file"]').setInputFiles(ARQUIVO_GRANDE);
conferir(
  await pagina.getByRole("alert").filter({ hasText: /O limite é 20,0 MB/ }).isVisible(),
  "🔴 recusa 20 MB + 1 byte ANTES de enviar",
);

await pagina.locator('input[type="file"]').setInputFiles(PDF_PEQUENO);
conferir(
  (await pagina.getByLabel(/^Título/).inputValue()) === "peticao-de-teste.pdf",
  "o nome do arquivo vira o título",
);
await pagina.getByLabel(/^Descrição/).fill("Enviada pelo roteiro de verificação");
await pagina.getByRole("button", { name: /^Salvar$/ }).click();

await pagina.getByText("peticao-de-teste.pdf").first().waitFor({ timeout: 20_000 });
conferir(true, "🔴 o arquivo SAIU da máquina e o documento apareceu na lista");

// ─────────────────────────────── dentro do processo
console.log("\n— aba dentro do processo —");
await pagina.goto(APP + PROCESSO);
await pagina.getByRole("tab", { name: "Documentos" }).click();
const painelDocs = await painel("Documentos");
await painelDocs.getByText("peticao-inicial-assinada.pdf").waitFor();
conferir(await painelDocs.isVisible(), "a aba Documentos abre no processo");
conferir(
  !(await (await painel("Detalhes")).isVisible()),
  "e o painel de Detalhes some -- não só o texto",
);
/* 🔴 O que só Chrome responde: painel escondido sai do FOCO. Se não sair,
   quem navega por Tab cai dentro de uma aba que não está vendo. */
const focoVazouPraDetalhes = await pagina.evaluate((id) => {
  const escondido = document.getElementById(id);
  return [...(escondido?.querySelectorAll("a, button, input, select, textarea") ?? [])].some(
    (e) => e.tabIndex >= 0 && e.offsetParent !== null,
  );
}, (await pagina.getByRole("tab", { name: "Detalhes" }).getAttribute("aria-controls")));
conferir(!focoVazouPraDetalhes, "🔴 o painel escondido sai do foco do teclado");

// ─────────────────────────────── dentro do cliente
console.log("\n— aba dentro do cliente —");
await pagina.goto(APP + CLIENTE + "?aba=documentos");
await pagina.getByRole("tab", { name: "Documentos" }).waitFor();
conferir(
  await (await painel("Documentos")).isVisible(),
  "?aba=documentos abre a aba certa no cliente",
);

// ─────────────────────────────── dentro do atendimento
console.log("\n— abas no atendimento (que não tinha nenhuma) —");
await pagina.goto(APP + "/atendimentos");
await pagina.locator("button").filter({ hasText: /—/ }).first().click();
await pagina.getByRole("tab", { name: "Registros" }).waitFor();
conferir(true, "o atendimento passou a ter abas");

const rascunho = "rascunho que não pode se perder";
await pagina.getByLabel("Novo registro do atendimento").fill(rascunho);
await pagina.getByRole("tab", { name: "Documentos" }).click();
await pagina.getByRole("tab", { name: "Registros" }).click();
conferir(
  (await pagina.getByLabel("Novo registro do atendimento").inputValue()) === rascunho,
  "🔴 o que foi digitado em 'Novo registro' sobrevive à troca de aba",
);

// ─────────────────────────────── excluir
console.log("\n— excluir —");
await pagina.goto(APP + "/documentos");
await pagina.getByText("peticao-de-teste.pdf").click();
await pagina.getByRole("heading", { name: "peticao-de-teste.pdf" }).waitFor();
await pagina.getByRole("button", { name: /Excluir/ }).click();
const dialogo = pagina.getByRole("dialog");
await dialogo.waitFor();
conferir(
  await dialogo.getByText(/não pode ser recuperado/).isVisible(),
  "🔴 o diálogo avisa que o ARQUIVO some pra sempre",
);
await dialogo.getByRole("button", { name: /Excluir/ }).click();
await pagina.getByRole("heading", { name: "Documentos" }).waitFor();
// De novo: espera a lista CHEGAR antes de afirmar que algo não está nela.
await pagina.getByText("peticao-inicial-assinada.pdf").waitFor({ timeout: 15_000 });
conferir(
  (await pagina.getByText("peticao-de-teste.pdf").count()) === 0,
  "e ele sai da lista",
);

// ─────────────────────────────── veredito
console.log("\n" + "─".repeat(60));
if (problemas.length) {
  console.log("respostas de erro e exceções durante o roteiro:");
  [...new Set(problemas)].forEach((p) => console.log(`  ! ${p}`));
}
const falhas = checagens.filter((c) => !c.ok);
console.log(`${checagens.length - falhas.length}/${checagens.length} checagens passaram`);

await navegador.close();
process.exit(falhas.length || problemas.length ? 1 : 0);
