/** O caminho completo de Documentos, contra PRODUÇÃO.
 *
 *   node scripts/verificar-producao.mjs
 *
 * 🔴 **Roda contra `argos-monitor.vercel.app` e escreve dados de verdade.**
 * É o único teste que prova o que nem o `yarn offline` nem o Chrome local
 * alcançam: o envio real atravessando o CSP e o CORS do bucket, com IAM,
 * SigV4 e a política do S3 todos valendo ao mesmo tempo.
 *
 * 🔴 **O login sai de `sessaoDeProducao.mjs`**, que reaproveita a sessão
 * guardada -- a senha só é digitada quando ela expirou. Até 01/09/2026 este
 * roteiro logava do zero e queimava uma das 5 tentativas a cada rodada; hoje
 * o normal é ZERO. As regras que valiam continuam valendo, e agora moram lá:
 * credenciais do `.env.local`, nada impresso, login PELA TELA, uma tentativa,
 * e para.
 *
 * ⚠️ O documento criado é apagado no `finally`, inclusive se algo estourar no
 * meio. O que sobrar carrega "VERIFICACAO AUTOMATICA" no título.
 */
import { abrirProducaoLogado } from "./sessaoDeProducao.mjs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = "https://argos-monitor.vercel.app";

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

/** Respostas de erro e violações de CSP -- é onde o envio quebraria. */
const problemas = [];

/* 🔴 O login sai de `sessaoDeProducao.mjs`: ele reaproveita a sessão guardada
   e a senha só é digitada quando ela expirou. Antes este roteiro logava do
   zero e queimava uma das 5 tentativas a cada rodada.

   ⚠️ Os ouvintes vão no `aoCriarPagina`, e não depois: eles precisam estar de
   pé ANTES da primeira navegação, senão uma violação de CSP na carga inicial
   passaria em branco. */
const { navegador, pagina } = await abrirProducaoLogado({
  viewport: { width: 1440, height: 950 },
  aoCriarPagina: (p) => {
    p.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
    p.on("console", (m) => {
      const t = m.text();
      if (/Content Security Policy|CORS|blocked/i.test(t)) problemas.push(`console: ${t.slice(0, 160)}`);
    });
    p.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("favicon")) {
        problemas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
      }
    });
  },
});

let criado = false;

try {
  /* O login já aconteceu em `abrirProducaoLogado` -- com sessão guardada,
     zero tentativas. */
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

  // ───────────────────────────── "quem responde, recebe" (26/08/2026)
  console.log("\n— responsáveis, em produção —");
  /* ⚠️ SÓ LEITURA. Estas checagens não criam nem alteram nada: mexer nos
     responsáveis de um processo real mudaria quem recebe e-mail de um caso
     de verdade. O que se prova aqui é que o campo migrado CHEGOU na tela e
     que os filtros funcionam contra o dado real -- o comportamento já foi
     provado no `yarn offline`. */
  await pagina.goto(APP + "/processos");
  await pagina.locator("table tbody tr").first().waitFor({ timeout: 25_000 });

  const cabecalhos = (await pagina.locator("table thead th").allInnerTexts()).map((c) =>
    c.toLocaleUpperCase("pt-BR"),
  );
  conferir(cabecalhos.includes("RESPONSÁVEL"), "a coluna Responsável está em produção");
  conferir(
    cabecalhos.includes("ÚLTIMA MOVIMENTAÇÃO"),
    "e 'Última movimentação' continua lá -- a sétima foi ACRESCENTADA",
  );

  /* 🔴 A prova de que a MIGRAÇÃO pegou: a coluna traz nome de VERDADE, e não
     "Sem responsável" em toda linha. Foram 10 processos e 1 atendimento
     preenchidos com `criado_por` em 26/08/2026.

     ⚠️ **A afirmação era outra e virou MENTIRA**: "NENHUMA linha pode dizer
     'Sem responsável'". Deixou de valer em 27/08/2026 -- um dia depois da
     migração. Responsáveis é campo OPCIONAL na criação (sem asterisco na
     tela, `default_factory=list` no schema), e o sistema tem até um filtro
     "Sem responsável" para esse estado: `shared/destinatarios.py` manda o
     aviso ao subgrupo inteiro quando não há ninguém na lista.

     Medido em produção em 01/09/2026: 29 processos, 26 com responsável e 3
     sem -- os três criados em 27 e 28/08, DEPOIS do corte. A afirmação antiga
     reprovava o comportamento correto.

     ➡️ O que sobrou é o que a migração garante de fato: se ela não tivesse
     pegado, os legados apareceriam TODOS órfãos.

     ⚠️ **E este cheque ENFRAQUECE com o tempo**, de propósito e com o custo
     assumido: quanto mais processos novos com responsável entram, menos ele
     distingue. Hoje só reprova se a página inteira estiver órfã. A alternativa
     -- exigir uma proporção -- seria número inventado, e quebraria sozinha na
     primeira semana movimentada. Quem quiser a prova forte da migração tem
     `scripts/migrar_responsaveis.py` em modo simulação, que lista o que ainda
     falta pelo dado, não pela tela. */
  const linhas = await pagina.locator("table tbody tr").allInnerTexts();
  const orfas = linhas.filter((l) => l.includes("Sem responsável")).length;
  conferir(
    linhas.length > 0 && orfas < linhas.length,
    "🔴 a migração pegou: a coluna traz responsável de verdade",
    `${linhas.length - orfas} de ${linhas.length} com responsável`,
  );

  await pagina.getByText("Todos os responsáveis").click();
  const semDono = await pagina.getByRole("option", { name: "Sem responsável" }).isVisible();
  conferir(semDono, "a pílula de responsável abre com as opções");
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
