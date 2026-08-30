/** A inscrição da OAB no perfil -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-oab-no-perfil.mjs
 *
 * 🔴 O que só Chrome responde, e que jsdom deu como aprovado:
 *
 *   - o `Select` de UF é `react-select` com painel em PORTAL. Em jsdom ele
 *     "abre" sem layout; aqui dá para ver se o painel aparece na tela, se
 *     cabe, e se a opção "Nenhuma" é alcançável -- é ela que apaga a
 *     inscrição, e sem ela o estado de "não tenho OAB" seria inatingível;
 *   - se o ciclo INTEIRO fecha contra a API de verdade: gravar, recarregar a
 *     página, e a inscrição ainda estar lá. É o defeito que o `GET /me`
 *     existe para evitar, e um mock de `lerMeuPerfil` nunca o reproduz.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login")) {
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  }
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

const numero = () => pagina.getByRole("textbox", { name: /Número da OAB/ });
const salvar = () => pagina.getByRole("button", { name: "Salvar" });

async function abrirPerfil() {
  await pagina.goto(APP + "/perfil");
  await pagina.getByRole("tab", { name: "Inscrição na OAB" }).click();
  await numero().waitFor();
}

/** 🔴 O script tem de começar de um estado CONHECIDO.
 *
 * A primeira versão assumia a conta sem OAB, e quebrou na segunda execução:
 * o passo "Salvar liga quando a inscrição fica completa" falhou porque a
 * inscrição já era aquela -- nada tinha mudado, e o botão estava certo em
 * ficar desligado. Verificação que só passa na primeira vez não é
 * verificação. */
async function zerarInscricao() {
  await abrirPerfil();
  if ((await numero().inputValue()) === "") return;
  await numero().fill("");
  await pagina.getByLabel("UF", { exact: true }).click();
  await pagina.getByRole("option", { name: "Nenhuma" }).click();
  await salvar().click();
  await pagina.getByText("Inscrição atualizada.").waitFor({ timeout: 5000 });
}

await zerarInscricao();

// ─────────────────────────── a tela abre com o que está salvo
console.log("— abertura —");
await abrirPerfil();
conferir(await salvar().isDisabled(), "Salvar da inscrição começa desligado");

/* 🔴 A DIVISÃO POR ABA, e o que ela garante: cada aba só conhece os próprios
   campos, então não há como uma sobrescrever o que é da outra num PATCH. */
conferir(
  (await pagina.getByRole("textbox", { name: /Nome completo/ }).count()) === 0,
  "🔴 a aba da inscrição NÃO tem o campo do nome",
);
/* ⚠️ VISIBILIDADE, não presença. `PainelDaAba` mantém os painéis MONTADOS
   (`display:none`), de propósito -- o projeto documenta isso em
   `verificar-abas.mjs`. Uma checagem por `count()` diria que o e-mail está na
   aba errada quando ele só está escondido. As consultas por PAPEL já ignoram
   o que está fora da árvore de acessibilidade; as por texto, não. */
/* ⚠️ VISIBILIDADE, não presença. `PainelDaAba` mantém os painéis MONTADOS
   (`display:none`), de propósito -- o projeto documenta isso em
   `verificar-abas.mjs`. Uma checagem por `count()` diria que o e-mail está na
   aba errada quando ele só está escondido. */
conferir(
  !(await pagina.locator("input#email-perfil").isVisible().catch(() => false)),
  "nem o e-mail (que está montado, porém escondido)",
);

await pagina.getByRole("tab", { name: "Meus dados" }).click();
await pagina.getByRole("textbox", { name: /Nome completo/ }).waitFor();
conferir(
  (await pagina.getByRole("textbox", { name: /Número da OAB/ }).count()) === 0,
  "🔴 e a aba de dados NÃO tem os campos da OAB",
);
conferir(
  await pagina.locator("input#email-perfil").isDisabled(),
  "o e-mail está na aba de dados, num campo travado",
);
conferir(
  (await pagina.locator("input#email-perfil").inputValue()) === CONTA.email,
  "e mostra o e-mail de quem está logado",
);
conferir(
  await pagina.getByRole("button", { name: /Alterar senha/ }).isVisible(),
  "a senha está com ele",
);

/* 🔴 O "i": `Popover`, não `Tooltip` -- hover não existe em toque, então o
   que importa é o CLIQUE abrir. E o balão não pode enviar o formulário. */
const i = pagina.getByRole("button", { name: /Por que o nome completo importa/ });
conferir(await i.isVisible(), 'o "i" aparece ao lado do rótulo');
await i.click();
const balao = pagina.getByText(/comparar com o nome que o tribunal devolve/);
await balao.waitFor({ timeout: 3000 }).catch(() => {});
conferir(await balao.isVisible(), "clicar no i abre a explicação");
conferir(
  await pagina.getByRole("button", { name: "Salvar" }).isDisabled(),
  "🔴 e NÃO enviou o formulário (o i é type=button)",
);
await pagina.keyboard.press("Escape");
await pagina.getByRole("tab", { name: "Inscrição na OAB" }).click();
await numero().waitFor();

// ─────────────────────────── 🔴 o painel de UF, que jsdom não desenha
console.log("\n— o seletor de UF —");
await pagina.getByLabel("UF", { exact: true }).click();
/* ⚠️ Por PAPEL, e não por texto: com a conta sem OAB, o valor exibido
   do próprio controle também diz "Nenhuma" -- o texto casa duas vezes. */
const nenhuma = pagina.getByRole("option", { name: "Nenhuma" });
await nenhuma.waitFor({ timeout: 3000 }).catch(() => {});
conferir(await nenhuma.isVisible(), 'a opção "Nenhuma" é alcançável', "é ela que apaga a inscrição");

const caixa = await nenhuma.boundingBox();
conferir(
  Boolean(caixa) && caixa.y >= 0 && caixa.y + caixa.height <= 950,
  "o painel cabe na tela",
  caixa ? `y=${Math.round(caixa.y)} h=${Math.round(caixa.height)}` : "sem caixa",
);
await pagina.keyboard.press("Escape");

// ─────────────────────────── gravar e RECARREGAR
console.log("\n— gravar e recarregar —");
await numero().fill("148502");
await pagina.getByLabel("UF", { exact: true }).click();
await pagina.getByRole("option", { name: "MG" }).click();
conferir(await salvar().isEnabled(), "Salvar liga quando a inscrição fica completa");
await salvar().click();
await pagina.getByText("Inscrição atualizada.").waitFor({ timeout: 5000 });

await abrirPerfil();
conferir(
  (await numero().inputValue()) === "148502",
  "🔴 depois de RECARREGAR, a inscrição continua na tela",
  "é o defeito que o GET /me existe para evitar",
);
/* ⚠️ Por COMPORTAMENTO, e não por estrutura. A primeira versão fazia
   `getByLabel("UF").getByText("MG")` e falhava -- mas a tela estava certa:
   num `react-select`, o `label` aponta para o input ESCONDIDO, que não tem
   filho nenhum. O valor visível é irmão dele.

   Duas asserções, e a segunda é a que prova: se a UF não tivesse voltado, a
   inscrição estaria pela metade e o campo diria "Selecione a UF da OAB". */
conferir(
  (await pagina.getByRole("tabpanel").filter({ hasText: "Número da OAB" }).innerText()).includes("MG"),
  "a UF também volta -- o valor aparece no formulário",
);
conferir(
  !(await pagina.getByText("Selecione a UF da OAB").isVisible().catch(() => false)),
  "e a inscrição está COMPLETA (nenhum erro de meia inscrição)",
);

// ─────────────────────────── o erro de meia inscrição
console.log("\n— caminhos de erro —");
await pagina.getByLabel("UF", { exact: true }).click();
await pagina.getByRole("option", { name: "Nenhuma" }).click();
conferir(
  await pagina.getByText("Selecione a UF da OAB").isVisible(),
  "número sem UF mostra o erro no campo certo",
);
conferir(await salvar().isDisabled(), "e trava o Salvar");

await numero().fill("abc");
conferir(
  await pagina.getByText("O número da OAB tem só dígitos").isVisible(),
  "letra no número mostra o erro",
);

// ─────────────────────────── limpar de verdade
console.log("\n— limpar —");
await numero().fill("");
conferir(await salvar().isEnabled(), "as duas vazias LIGAM o Salvar (é assim que se apaga)");
await salvar().click();
await pagina.getByText("Inscrição atualizada.").waitFor({ timeout: 5000 });
await abrirPerfil();
conferir((await numero().inputValue()) === "", "depois de recarregar, a inscrição sumiu mesmo");

// ─────────────────────────── fecho
console.log("");
for (const p of problemas) console.log(`FALHA  ${p}`);
const falhas = checagens.filter((c) => !c.ok).length + problemas.length;
console.log(`\n${checagens.length - falhas + problemas.length * 0}/${checagens.length} checagens ok, ${problemas.length} problema(s) de página`);
await navegador.close();
process.exit(falhas ? 1 : 0);
