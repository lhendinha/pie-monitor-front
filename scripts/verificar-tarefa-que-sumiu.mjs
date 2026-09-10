/** O modal de uma tarefa aberto enquanto um lote a exclui, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline   (esperar "Server ready")
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-tarefa-que-sumiu.mjs
 *
 * 🔴 O caso de verdade são DUAS abas: a da esquerda abre a tarefa, a da
 * direita a exclui pelo lote, e só então a da esquerda salva -- ou exclui.
 * O teste do modal simula o 404; aqui ele vem do servidor.
 *
 * ⚠️ Escreve no offline: exclui duas tarefas do quadro do Cível.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 9.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const FOTOS = "/tmp/fase9";
const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
const erros = [];
const veredito = [];
const ok = (nome, cond, det = "") => { veredito.push([nome, Boolean(cond), det]); };

async function abrirQuadroDoCivel(pagina) {
  await pagina.goto(`${APP}/kanban`);
  await pagina.getByRole("heading", { name: "Gestão kanban" }).waitFor();
  await pagina.waitForLoadState("networkidle");
  await pagina.waitForTimeout(500);
  /* ⚠️ A segunda aba abre com o subgrupo que a primeira escolheu: só troca
     quando a pílula ainda mostra o padrão. */
  if (await pagina.getByText("A Filtro", { exact: true }).count()) {
    await pagina.getByText("A Filtro", { exact: true }).first().click();
    await pagina.getByPlaceholder("Buscar subgrupo").fill("Cível");
    await pagina.waitForTimeout(700);
    await pagina.getByRole("option", { name: "Cível", exact: true }).first().click();
    await pagina.waitForLoadState("networkidle");
  }
  await pagina.getByText("Cível", { exact: true }).first().waitFor({ timeout: 8000 });
  await pagina.waitForTimeout(800);
}

/** Os títulos dos cartões da primeira coluna, como a tela os mostra. */
const cartoesDaPrimeiraColuna = (pagina) => pagina.evaluate(() => {
  const coluna = [...document.querySelectorAll("div")]
    .find((d) => d.className && getComputedStyle(d).flexBasis === "300px");
  return [...(coluna?.querySelectorAll('[role="button"], label[data-part="root"]') ?? [])]
    .map((n) => n.querySelector("p")?.textContent?.trim()).filter(Boolean);
});
/** O `data-tipo` do aviso com esse texto, lido NA HORA: ele vive 4,5s. */
const tipoDoAviso = (pagina, texto) => pagina.evaluate((t) =>
  [...document.querySelectorAll("[data-tipo]")].find((a) => a.textContent?.includes(t))?.getAttribute("data-tipo") ?? null, texto);
const naTela = (pagina, titulo) => pagina.evaluate((t) =>
  [...document.querySelectorAll("p")].some((p) => p.textContent?.trim() === t), titulo);

/** A aba da direita exclui UMA tarefa pelo lote, e sai do modo. */
async function excluirPeloLote(pagina, titulo) {
  await abrirQuadroDoCivel(pagina);
  await pagina.getByRole("button", { name: "Selecionar", exact: true }).click();
  await pagina.waitForTimeout(300);
  await pagina.getByText(titulo, { exact: true }).first().click();
  await pagina.getByRole("button", { name: "Excluir 1", exact: true }).click();
  const dialogo = pagina.getByRole("dialog");
  await dialogo.getByRole("button", { name: /^Excluir/ }).click();
  await pagina.getByText(/excluída/).first().waitFor({ timeout: 8000 });
  await pagina.waitForTimeout(400);
}

/** Foto das duas abas antes de morrer: o erro sozinho não diz o que a tela mostrava. */
process.on("uncaughtException", async (e) => {
  for (const [nome, aba] of [["esquerda", esquerda], ["direita", direita]]) {
    await aba?.screenshot({ path: `${FOTOS}-falha-${nome}.png` }).catch(() => {});
  }
  console.error(e);
  await navegador.close();
  process.exit(2);
});

let direita;
const esquerda = await contexto.newPage();
esquerda.on("pageerror", (e) => erros.push(String(e)));
await esquerda.goto(APP);
await esquerda.getByLabel(/e-?mail/i).fill("chefe@local.test");
await esquerda.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
await esquerda.getByRole("button", { name: /entrar/i }).click();
await esquerda.waitForLoadState("networkidle");
direita = await contexto.newPage();
direita.on("pageerror", (e) => erros.push(String(e)));

await abrirQuadroDoCivel(esquerda);
const [salvarEsta, excluirEsta] = await cartoesDaPrimeiraColuna(esquerda);
console.log(`passo: salvar=${salvarEsta} | excluir=${excluirEsta}`);

// ------------------------------------------------ 1) SALVAR o que sumiu
await esquerda.getByText(salvarEsta, { exact: true }).first().click();
await esquerda.getByRole("heading", { name: "Editar tarefa" }).waitFor();
await esquerda.getByLabel(/Descrição da tarefa/).fill(`${salvarEsta} (editada)`);

await excluirPeloLote(direita, salvarEsta);
ok("direita: o lote excluiu a tarefa", !(await naTela(direita, salvarEsta)));

await esquerda.bringToFront();
await esquerda.getByRole("button", { name: "Salvar", exact: true }).click();
const avisoSalvar = esquerda.getByText("Esta tarefa foi excluída, e as alterações não foram salvas.");
await avisoSalvar.waitFor({ timeout: 8000 });
const tipoSalvar = await tipoDoAviso(esquerda, "Esta tarefa foi excluída");
ok("salvar: o aviso diz que NADA foi salvo", await avisoSalvar.isVisible());
ok("salvar: o aviso é de ERRO", tipoSalvar === "erro", String(tipoSalvar));
await esquerda.screenshot({ path: `${FOTOS}-1-salvar.png` });
ok("salvar: não disse 'Tarefa atualizada.'", (await esquerda.getByText("Tarefa atualizada.").count()) === 0);
ok("salvar: o modal fechou", (await esquerda.getByRole("heading", { name: "Editar tarefa" }).count()) === 0);
await esquerda.waitForLoadState("networkidle");
await esquerda.waitForTimeout(600);
ok("salvar: o cartão sumiu do quadro sem recarregar a página", !(await naTela(esquerda, salvarEsta)));
ok("salvar: nem a versão editada apareceu", !(await naTela(esquerda, `${salvarEsta} (editada)`)));

// ------------------------------------------------ 2) EXCLUIR o que sumiu
await esquerda.getByText(excluirEsta, { exact: true }).first().click();
await esquerda.getByRole("heading", { name: "Editar tarefa" }).waitFor();

await excluirPeloLote(direita, excluirEsta);
ok("direita: o lote excluiu a segunda", !(await naTela(direita, excluirEsta)));

await esquerda.bringToFront();
await esquerda.getByRole("button", { name: "Excluir", exact: true }).click();
const confirmacao = esquerda.getByRole("dialog", { name: "Excluir tarefa" });
await confirmacao.getByRole("button", { name: "Excluir", exact: true }).click();
const avisoExcluir = esquerda.getByText("A tarefa já tinha sido excluída.");
await avisoExcluir.waitFor({ timeout: 8000 });
const tipoExcluir = await tipoDoAviso(esquerda, "A tarefa já tinha sido excluída.");
ok("excluir: o aviso diz que ela já tinha ido", await avisoExcluir.isVisible());
ok("excluir: o aviso é de SUCESSO", tipoExcluir === "sucesso", String(tipoExcluir));
await esquerda.screenshot({ path: `${FOTOS}-2-excluir.png` });
ok("excluir: sem 'Não foi possível excluir.'", (await esquerda.getByText("Não foi possível excluir.").count()) === 0);
ok("excluir: os dois modais fecharam", (await esquerda.getByRole("dialog").count()) === 0);
await esquerda.waitForLoadState("networkidle");
await esquerda.waitForTimeout(600);
ok("excluir: o cartão sumiu do quadro", !(await naTela(esquerda, excluirEsta)));

// ------------------------------------------------ 3) o quadro segue utilizável
const restantes = await cartoesDaPrimeiraColuna(esquerda);
if (restantes[0]) {
  await esquerda.getByText(restantes[0], { exact: true }).first().click();
  ok("o quadro segue utilizável: outra tarefa abre", await esquerda.getByRole("heading", { name: "Editar tarefa" }).isVisible());
}
ok("nenhum erro de página", erros.length === 0, erros.join(" | "));

await navegador.close();
let falhas = 0;
for (const [nome, passou, det] of veredito) {
  if (!passou) falhas += 1;
  console.log(`  ${passou ? "ok  " : "FALHOU"} ${nome}${det && !passou ? ` -- ${det}` : ""}`);
}
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
