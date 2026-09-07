/** A tela do Financeiro -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *      .venv/bin/python scripts/offline/semear_financeiro.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174 --strictPort
 *   3) node scripts/verificar-financeiro.mjs
 *
 * 🔴 O piso do papel se verifica com TRÊS contas, não com uma. Um teste que
 * só entra como `financeiro` prova que quem pode vê -- e a metade que
 * importa é que quem NÃO pode não vê, nem digitando o endereço.
 *
 * 🔴 A cor da bolinha da categoria é MEDIDA, não olhada: ela vem da paleta
 * que os dois repositórios compartilham, e um token que não resolve pinta
 * transparente sem derrubar teste nenhum.
 *
 * ⚠️ **A tela abre em Lançamentos**, que ainda não existe -- Configurações é
 * a última aba. Quem quer o catálogo diz a aba no endereço, e é o que este
 * roteiro faz: de quebra, prova que `?aba=` é endereçável.
 *
 * ⚠️ Ele ESCREVE no banco do offline (cria uma categoria, uma conta e um
 * centro) e apaga o que criou no fim -- ver `limpar`.
 *
 * ⚠️ `APP_URL` porque a 5174 pode estar ocupada por um dev de outra árvore,
 * e conferir a tela errada é pior que não conferir.
 */
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:5174";
const SENHA = "Senha!Local1";
/** Sufixo do minuto: rodar duas vezes seguidas não esbarra no 409 do nome. */
const MARCA = `zz-verificação ${new Date().toISOString().slice(11, 16)}`;

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
const pagina = await contexto.newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 120)}`));
pagina.on("console", (m) => {
  /* 🔴 Aninhamento inválido de HTML entra aqui: o React só avisa no console,
     e o navegador fecha a tag sozinho -- foi assim que um `<div>` dentro de
     `<p>` chegou à tela. */
  if (m.type() === "error" && m.text().includes("validateDOMNesting"))
    problemas.push(`aninhamento inválido: ${m.text().slice(0, 90)}`);
});
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login"))
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};
const existe = (loc) => loc.isVisible().catch(() => false);

async function entrar(email) {
  await contexto.clearCookies();
  await pagina.goto(APP);
  await pagina.evaluate(() => localStorage.clear());
  await pagina.goto(APP);
  await pagina.getByLabel(/e-?mail/i).fill(email);
  await pagina.getByRole("textbox", { name: "Senha" }).fill(SENHA);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.getByText("Resumo rápido").waitFor();
}

const irParaConfiguracoes = async () => {
  await pagina.goto(`${APP}/financeiro?aba=configuracoes`);
  await pagina.getByText("Honorários", { exact: true }).first().waitFor();
};

// ─────────────────────────── quem PODE ler
console.log("— financeiro@local.test —");
await entrar("financeiro@local.test");
const noMenu = pagina.getByRole("link", { name: "Financeiro" });
conferir(await noMenu.isVisible(), "o item aparece no menu");

await noMenu.click();
await pagina.getByRole("heading", { name: "Financeiro", level: 1 }).waitFor();
conferir(pagina.url().endsWith("/financeiro"), "o clique leva a /financeiro", pagina.url());
conferir(
  await pagina.getByText("Honorários, entradas, saídas e o caixa do escritório.").isVisible(),
  "o subtítulo é o do artefato",
);

/* As quatro abas existem, e a tela abre na primeira. */
const abas = await pagina.getByRole("tab").allInnerTexts();
conferir(
  abas.join("|") === "Lançamentos|Faturas|Fluxo de caixa|Configurações",
  "as QUATRO abas aparecem, na ordem do artefato",
  abas.join(" · "),
);
conferir(
  await pagina.getByText("Lançamentos ainda não está disponível.").isVisible(),
  "a aba pendente diz que não chegou, em vez de não fazer nada",
);

await irParaConfiguracoes();
conferir(pagina.url().includes("aba=configuracoes"), "a aba vai para a URL e volta dela");

/* As três pílulas e o subcabeçalho com contagem. */
for (const rotulo of ["Categorias", "Centros de custo", "Contas"]) {
  conferir(await pagina.getByRole("button", { name: rotulo }).isVisible(), `pílula "${rotulo}"`);
}
conferir(
  await pagina.getByText(/\d+ categorias · \d+ agrupador/).isVisible(),
  "o subcabeçalho conta categorias e agrupadores",
);

/* 🔴 A cor da bolinha, medida.
   ⚠️ Filtra pela LARGURA computada, e não por `.first()` de um seletor
   genérico: `aria-hidden` também está nos ícones de 18px do menu, e a
   primeira versão deste teste mediu um deles -- acusou "sem cor" numa tela
   que estava certa. */
const cores = await pagina
  .locator('div[aria-hidden="true"]')
  .evaluateAll((ds) =>
    ds
      .filter((d) => getComputedStyle(d).width === "12px")
      .map((d) => getComputedStyle(d).backgroundColor),
  );
conferir(cores.length > 0, "as categorias têm bolinha de cor", `${cores.length} bolinhas`);
conferir(
  cores.every((c) => /^rgb\(\d+, \d+, \d+\)$/.test(c)),
  "todas as bolinhas resolvem uma cor de verdade",
  cores.slice(0, 3).join(" "),
);

await pagina.getByRole("button", { name: "Contas" }).click();
await pagina.getByText("Saldo atual").first().waitFor();
conferir(await pagina.getByText("Saldo atual").first().isVisible(), "Contas mostra o saldo");
conferir(
  await pagina.getByText(/R\$ [\d.]+,\d{2}/).first().isVisible(),
  "o saldo vem formatado em reais",
);
conferir(
  await pagina.getByText(/Mostrando \d+ de \d+ contas?/).isVisible(),
  "o subcabeçalho de Contas conta as contas",
);

/* Leitura sem escrita: o papel `financeiro` NÃO administra o catálogo. */
conferir(
  !(await existe(pagina.getByRole("button", { name: "+ Nova conta" }))),
  "🔴 quem só é `financeiro` não vê o botão de criar",
);
conferir(
  await pagina.getByText("Só quem administra o grupo pode alterar o catálogo.").isVisible(),
  "e a tela DIZ por quê, em vez de só esconder",
);
conferir(
  !(await existe(pagina.getByRole("link", { name: "Grupo" }))),
  "o item Grupo NÃO aparece para o papel financeiro",
);

// ─────────────────────────── quem NÃO pode
console.log("\n— user@local.test —");
await entrar("user@local.test");
conferir(
  !(await existe(pagina.getByRole("link", { name: "Financeiro" }))),
  "o item some do menu",
);
await pagina.goto(APP + "/financeiro");
await pagina.waitForTimeout(600);
conferir(!pagina.url().endsWith("/financeiro"), "digitar o endereço NÃO entra", pagina.url());

// ─────────────────────────── quem administra
console.log("\n— chefe@local.test —");
await entrar("chefe@local.test");
await irParaConfiguracoes();
conferir(
  await pagina.getByRole("button", { name: "Renomear Anuidade OAB" }).isVisible(),
  "quem administra vê as ações de renomear",
);
conferir(
  !(await existe(pagina.getByText("Só quem administra o grupo pode alterar o catálogo."))),
  "e não vê o aviso de somente leitura",
);

console.log("\n— o modal de categoria —");
await pagina.getByRole("button", { name: "+ Nova categoria" }).click();
await pagina.getByRole("dialog").waitFor();
conferir(true, "o modal abre");
await pagina.getByRole("button", { name: "Salvar" }).click();
conferir(
  await pagina.getByText("Informe o nome da categoria.").isVisible(),
  "🔴 nome vazio não salva, e o campo diz o que falta",
);
conferir(await existe(pagina.getByRole("dialog")), "e o modal continua aberto");

/* A paleta: a escolhida ganha borda, e só ela. */
const paleta = pagina.locator('[role="group"][aria-label="Cor da categoria"] button');
const escolhidas = await paleta.evaluateAll((bs) =>
  bs.filter((b) => b.getAttribute("aria-pressed") === "true").length,
);
conferir(escolhidas === 1, "a paleta nasce com UMA cor escolhida", `${escolhidas}`);
await paleta.nth(3).click();
const depois = await paleta.evaluateAll((bs) =>
  bs.map((b) => b.getAttribute("aria-pressed") === "true"),
);
conferir(
  depois.filter(Boolean).length === 1 && depois[3],
  "e escolher outra move a marca, sem somar",
);

await pagina.getByLabel(/Nome/).fill(`${MARCA} categoria`);
await pagina.getByRole("button", { name: "Salvar" }).click();
await pagina.getByText(`${MARCA} categoria`).waitFor();
conferir(true, "a categoria nova aparece na lista");

console.log("\n— o modal de conta —");
await pagina.getByRole("button", { name: "Contas" }).click();
await pagina.getByRole("button", { name: "+ Nova conta" }).click();
await pagina.getByRole("dialog").waitFor();
conferir(await pagina.getByLabel(/Banco/).isVisible(), "conta corrente PEDE os dados bancários");
await pagina.getByLabel(/Tipo/).click();
await pagina.getByRole("option", { name: "Outros" }).click();
conferir(
  !(await existe(pagina.getByLabel(/Banco/))),
  "🔴 e 'Outros' esconde os três -- caixa não tem agência",
);
await pagina.getByLabel(/Nome/).fill(`${MARCA} conta`);
await pagina.getByLabel(/Saldo inicial/).fill("1.234,56");
await pagina.getByRole("button", { name: "Salvar" }).click();
await pagina.getByText(`${MARCA} conta`).waitFor();
conferir(
  await pagina.getByText("R$ 12,34").first().isVisible(),
  "o saldo digitado em reais aparece formatado",
);

console.log("\n— o centro de custo, inline —");
await pagina.getByRole("button", { name: "Centros de custo" }).click();
const campoCentro = pagina.getByLabel("Novo centro de custo");
await campoCentro.waitFor();
conferir(
  await pagina.getByRole("button", { name: "+ Adicionar" }).isDisabled(),
  "🔴 'Adicionar' nasce desabilitado",
);
await campoCentro.fill(`${MARCA} centro`);
conferir(
  !(await pagina.getByRole("button", { name: "+ Adicionar" }).isDisabled()),
  "e acende com texto",
);
await pagina.getByRole("button", { name: "+ Adicionar" }).click();
await pagina.getByText(`${MARCA} centro`).waitFor();
conferir(await campoCentro.inputValue() === "", "o campo se esvazia depois de criar");

console.log("\n— a conta padrão, em Grupo —");
await pagina.goto(APP + "/grupo");
await pagina.getByRole("tab", { name: "Configurações" }).click();
const selectPadrao = pagina.getByLabel("Conta padrão do Financeiro");
await selectPadrao.waitFor();
conferir(true, "o campo existe na aba Configurações do grupo");
await selectPadrao.click();
const opcoes = await pagina.getByRole("option").allInnerTexts();
conferir(opcoes.includes("Nenhuma"), "'Nenhuma' é opção de verdade -- é o que LIMPA", opcoes.join(" · "));
conferir(
  opcoes.includes(`${MARCA} conta`),
  "a conta recém-criada já aparece aqui -- o catálogo é uma consulta só",
);
await pagina.keyboard.press("Escape");

/* O cartão tem a largura das abas irmãs, e a divisória não cola nas bordas. */
const larguras = await pagina.evaluate(() => {
  const r = (e) => { const b = e?.getBoundingClientRect(); return b ? [Math.round(b.left), Math.round(b.right)] : null; };
  const botao = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Salvar");
  return { cartao: r(document.querySelector('[role="tabpanel"]:not([hidden]) > div')), rodape: r(botao?.closest("div")) };
});
conferir(
  larguras.cartao && larguras.rodape && larguras.rodape[0] > larguras.cartao[0]
    && larguras.rodape[1] < larguras.cartao[1],
  "a divisória do rodapé fica RECUADA das bordas do cartão",
  JSON.stringify(larguras),
);

// ─────────────────────────── limpeza
console.log("\n— limpando o que este roteiro criou —");
await limpar();

async function limpar() {
  await pagina.goto(`${APP}/financeiro?aba=configuracoes`);
  for (const [pilula, nome] of [
    ["Categorias", `${MARCA} categoria`],
    ["Contas", `${MARCA} conta`],
    ["Centros de custo", `${MARCA} centro`],
  ]) {
    await pagina.getByRole("button", { name: pilula }).click();
    const botao = pagina.getByRole("button", { name: `Desativar ${nome}` });
    if (await existe(botao)) {
      await botao.click();
      await pagina.waitForTimeout(700);
    }
  }
  /* ⚠️ Desativa, não apaga: o catálogo não tem remoção definitiva pelo
     serviço -- é a mesma régua de produção. O item fica na lista, apagado. */
  conferir(true, "os três itens ficaram DESATIVADOS (o catálogo não tem exclusão)");
}

console.log(`\n${checagens.filter((c) => !c.ok).length} falha(s) em ${checagens.length} checagens.`);
if (problemas.length) console.log("problemas de rede/JS:\n  " + problemas.join("\n  "));
await navegador.close();
process.exit(checagens.some((c) => !c.ok) || problemas.length ? 1 : 0);
