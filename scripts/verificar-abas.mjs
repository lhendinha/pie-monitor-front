/** As abas do detalhe de processo e de cliente -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_abas.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-abas.mjs
 *
 * 🔴 A régua é `toBeVisible`, não "está no documento": os painéis vão
 * MONTADOS de propósito (o de Detalhes é formulário com estado local), então
 * o conteúdo das três abas existe na página o tempo todo. Um teste que só
 * procura o texto passa com as abas completamente quebradas -- foi assim que
 * os testes antigos desta tela passaram sem enxergar nada.
 *
 * jsdom já cobre o comportamento; o que só Chrome responde é se o painel
 * escondido sai mesmo do FOCO (Tab não pode cair dentro dele) e se o
 * `display:none` do Chakra chega até o DOM renderizado.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
const PROCESSO = "/processos/3bc2708f19ca/90000000000000000000";
const CLIENTE = "/clientes/cli-g-alfa";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 120)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400) problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

const checagens = [];
const conferir = (o, nome, detalhe = "") => {
  checagens.push({ ok: o, nome, detalhe });
  console.log(`${o ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
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

// ─────────────────────────── detalhe do processo
console.log("— detalhe do processo —");
await pagina.goto(APP + PROCESSO);
await pagina.getByRole("tab", { name: "Detalhes" }).waitFor();

conferir(await (await painel("Detalhes")).isVisible(), "abre na aba Detalhes");
conferir(!(await (await painel("Tarefas")).isVisible()), "painel de Tarefas escondido");
conferir(
  !(await (await painel("Movimentações")).isVisible()),
  "painel de Movimentações escondido",
);
conferir(
  await pagina.getByText(/Verificado em/).isVisible(),
  '"Verificado em" visível fora das abas',
);

/* 🔴 O que só Chrome responde: o Tab não pode entrar no painel escondido.
   É por isso que `PainelDaAba` usa `display:none` e não `opacity` ou
   `visibility` -- com os outros dois, o cursor caminha pra dentro de uma aba
   invisível e some da tela. */
await pagina.getByRole("tab", { name: "Detalhes" }).focus();
const alcancados = new Set();
for (let i = 0; i < 40; i++) {
  await pagina.keyboard.press("Tab");
  const id = await pagina.evaluate(() => {
    const a = document.activeElement;
    return a?.closest('[role="tabpanel"]')?.id ?? "";
  });
  if (id) alcancados.add(id);
}
const idTarefas = await (await painel("Tarefas")).getAttribute("id");
const idMovs = await (await painel("Movimentações")).getAttribute("id");
conferir(
  !alcancados.has(idTarefas) && !alcancados.has(idMovs),
  "o Tab não entra em painel escondido",
  `alcançou: ${[...alcancados].join(", ") || "nenhum"}`,
);

// o rascunho sobrevive à troca de aba
const apelido = pagina.getByLabel("Apelido");
await apelido.fill("Rascunho que não pode sumir");
await pagina.getByRole("tab", { name: "Movimentações" }).click();
await pagina.getByRole("tab", { name: "Detalhes" }).click();
conferir(
  (await apelido.inputValue()) === "Rascunho que não pode sumir",
  "o que foi digitado sobrevive à ida e volta entre abas",
);

// a aba na URL, e o F5
await pagina.getByRole("tab", { name: "Movimentações" }).click();
conferir(pagina.url().includes("aba=movimentacoes"), "a aba vai pra URL");
await pagina.reload();
await pagina.getByRole("tab", { name: "Movimentações" }).waitFor();
conferir(
  await (await painel("Movimentações")).isVisible(),
  "F5 devolve a MESMA aba, não a primeira",
);

// aba inventada cai na primeira
await pagina.goto(`${APP}${PROCESSO}?aba=inventada`);
await pagina.getByRole("tab", { name: "Detalhes" }).waitFor();
conferir(await (await painel("Detalhes")).isVisible(), "aba inventada cai na primeira");

// ─────────────────────────── o teor da movimentação
console.log("\n— o teor da movimentação —");
await pagina.goto(`${APP}${PROCESSO}?aba=movimentacoes`);
await pagina.getByRole("button", { name: /Intimação/ }).waitFor();

conferir(
  !(await pagina.getByText(/Fica a parte/).count()),
  "a lista NÃO despeja o teor da publicação",
);
await pagina.getByRole("button", { name: /Intimação/ }).click();
const modal = pagina.getByRole("dialog");
conferir(await modal.getByText(/Fica a parte/).isVisible(), "o modal mostra o teor");
for (const campo of ["Tipo de comunicação", "Disponibilizada em", "Órgão", "Teor da publicação"]) {
  conferir(await modal.getByText(campo, { exact: true }).isVisible(), `campo "${campo}"`);
}
/* Removido a pedido em 26/08/2026 -- a checagem virou de AUSÊNCIA, pra que
   voltar a exibir o link seja decisão e não descuido. */
conferir(
  !(await modal.getByRole("link", { name: /tribunal/i }).count()),
  "NÃO oferece caminho pro site do tribunal",
);
conferir(pagina.url().includes("comunicacao=900001"), "a movimentação ganha endereço na URL");

/* 🔴 O par: a Intimação teve e-mail, a Citação não. Um botão que aparecesse
   sempre passaria na primeira e falharia só na segunda. */
conferir(
  await modal.getByRole("button", { name: "Ver o e-mail enviado" }).isVisible(),
  "com envio, oferece o caminho pro e-mail",
);
await modal.getByRole("button", { name: "Ver o e-mail enviado" }).click();
await pagina.getByText("Detalhes do envio").waitFor({ timeout: 15000 }).catch(() => {});
conferir(
  await pagina.getByRole("dialog").getByText("Fica a parte intimada").isVisible(),
  "e o Histórico abre JÁ naquele envio",
  pagina.url().replace(APP, ""),
);

// o link abre direto, sem a aba junto
//
// ⚠️ `waitFor` antes de conferir: a página chega vazia e só decide a aba
// quando `GET /detalhes` responde. Sem esperar, o roteiro media a tela do
// esqueleto e acusava um defeito que não existe -- foi o que aconteceu na
// primeira rodada.
await pagina.goto(`${APP}${PROCESSO}?comunicacao=900001`);
const teorDoLink = pagina.getByRole("dialog").getByText(/Fica a parte/);
await teorDoLink.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
conferir(await teorDoLink.isVisible(), "o link do teor abre direto, mesmo sem a aba na URL");

// movimentação sem texto: o outro ramo do modal
await pagina.goto(`${APP}${PROCESSO}?aba=movimentacoes`);
await pagina.getByRole("button", { name: /Citação/ }).click();
conferir(
  await pagina.getByRole("dialog").getByText(/chegou sem o texto da publicação/).isVisible(),
  "movimentação sem teor DIZ isso, em vez de mostrar campo vazio",
);
conferir(
  !(await pagina.getByRole("button", { name: "Ver o e-mail enviado" }).count()),
  "SEM envio, o botão do e-mail não existe",
);
/* ⚠️ Conta BOTÕES, não procura classe: `RodapeDeAcoes` é emotion, com nome
   de classe embaralhado -- um seletor por classe nunca casaria, e a checagem
   passaria sempre sem verificar nada. Sem envio e sem link do tribunal, o
   único botão do diálogo é o X de fechar. */
const botoesDoModal = await pagina.getByRole("dialog").getByRole("button").count();
conferir(botoesDoModal === 1, "sem ação nenhuma, o modal fica só com o X", `${botoesDoModal} botão(ões)`);
await pagina.getByRole("button", { name: "Fechar" }).click();
/* 🔴 Duas asserções, e a segunda é a que importa. Conferindo só a URL, este
   roteiro deu "ok" enquanto fechar o teor expulsava a pessoa pra aba de
   Detalhes -- o defeito que esta rodada encontrou. */
conferir(!pagina.url().includes("comunicacao"), "fechar limpa a URL");
conferir(
  await pagina.getByRole("button", { name: /Intimação/ }).isVisible(),
  "e deixa a pessoa na LISTA de onde ela veio",
);

// link para movimentação que não está aqui
await pagina.goto(`${APP}${PROCESSO}?comunicacao=111111`);
const recado = pagina.getByText("A movimentação deste link não está mais neste processo.");
await recado.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
conferir(await recado.isVisible(), "link para movimentação inexistente DIZ isso");

// ─────────────────────────── as tarefas vinculadas
console.log("\n— as tarefas vinculadas —");
await pagina.goto(`${APP}${PROCESSO}?aba=tarefas`);
await pagina.getByRole("button", { name: /Protocolar réplica/ }).waitFor();
const riscada = await pagina
  .getByRole("button", { name: /Juntar procuração/ })
  .locator("text=Juntar procuração")
  .evaluate((e) => getComputedStyle(e).textDecorationLine);
conferir(riscada.includes("line-through"), "tarefa em coluna de conclusão sai riscada", riscada);
await pagina.getByRole("button", { name: /Protocolar réplica/ }).click();
conferir(
  (await pagina.getByLabel("Descrição da tarefa").inputValue()) === "Protocolar réplica",
  "clicar na tarefa abre o modal de edição",
);
await pagina.getByRole("button", { name: "Cancelar" }).click();

// ─────────────────────────── detalhe do cliente
console.log("\n— detalhe do cliente —");
await pagina.goto(APP + CLIENTE);
await pagina.getByRole("tab", { name: "Detalhes" }).waitFor();
conferir(await (await painel("Detalhes")).isVisible(), "abre na aba Detalhes");
conferir(
  !(await (await painel("Processos vinculados")).isVisible()),
  "painel de processos escondido",
);

await pagina.getByRole("tab", { name: "Processos vinculados" }).click();
conferir(pagina.url().includes("aba=processos"), "a aba vai pra URL");
const linha = pagina.getByRole("button", { name: /indenização/ });
await linha.waitFor();
await linha.click();
const resumo = pagina.getByRole("dialog");
conferir(
  await resumo.getByText("9000000-00.0000.0.00.0000").isVisible(),
  "o resumo mostra o número",
);
conferir(await resumo.getByText("Aguardando sentença").isVisible(), "e a situação");
conferir(await resumo.getByText("Conhecimento (1º Grau)").isVisible(), "e a fase");
await resumo.getByRole("button", { name: "Abrir processo" }).click();
await pagina.getByRole("tab", { name: "Movimentações" }).waitFor();
conferir(
  pagina.url().includes("/processos/3bc2708f19ca/90000000000000000000"),
  '"Abrir processo" leva ao processo certo',
  pagina.url().replace(APP, ""),
);

// ─────────────────────────── veredito
console.log("\n──────────");
for (const p of problemas) console.log(`  ⚠️  ${p}`);
const falhas = checagens.filter((c) => !c.ok);
console.log(`${checagens.length - falhas.length}/${checagens.length} checagens passaram`);
if (falhas.length) console.log("FALHARAM: " + falhas.map((f) => f.nome).join(" | "));
await navegador.close();
process.exit(falhas.length ? 1 : 0);
