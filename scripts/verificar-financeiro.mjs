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
 * ⚠️ **A tela abre em Lançamentos.** Quem quer o catálogo diz a aba no
 * endereço, e é o que este roteiro faz: de quebra, prova que `?aba=` é
 * endereçável.
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
/* ⚠️ `exact`: "Salvar e adicionar outra" também casa com /Salvar/, e o
   Playwright recusa o seletor ambíguo em vez de escolher um. */
const salvar = () => pagina.getByRole("button", { name: "Salvar", exact: true });

/** Acha na lista o item que este roteiro acabou de criar.
 *
 * 🔴 As três listas do catálogo são PAGINADAS e ordenadas por nome, e o
 * prefixo `zz-` põe o item novo no FIM -- numa base com vinte contas ele
 * nasce na página 3, e esperar por ele na página 1 falha por paginação, não
 * por defeito. Medido: 23 contas no offline, sete delas restos de rodadas
 * anteriores (o catálogo não tem exclusão, só desativação).
 *
 * ⚠️ Sobe o "Por página" para 100 em vez de clicar até a última página: é um
 * gesto só, e prova de quebra que o seletor de tamanho funciona.
 *
 * ⚠️ Ele NÃO é um `<select>` nativo -- é o `Select` do projeto (react-select),
 * então `selectOption` não serve: abre-se o painel e clica-se na opção.
 */
async function acharNaLista(texto) {
  const porPagina = pagina.locator("#tamanho-pagina");
  if (await existe(porPagina)) {
    await porPagina.click();
    await pagina.getByRole("option", { name: "100" }).click();
    await pagina.waitForTimeout(600);
  }
  await pagina.getByText(texto).first().waitFor();
}

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
  await pagina.getByText("Faturas ainda não está disponível.").isVisible().catch(() => false)
    || (await pagina.getByRole("tab", { name: "Faturas" }).click(), true),
  "a aba ainda PENDENTE diz que não chegou, em vez de não fazer nada",
);
await pagina.getByRole("tab", { name: "Lançamentos" }).click();

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
  await pagina.getByRole("button", { name: "Desativar Anuidade OAB" }).isVisible(),
  "quem administra vê o olho de desativar",
);
conferir(
  !(await existe(pagina.getByRole("button", { name: "Renomear Anuidade OAB" }))),
  "🔴 e NÃO vê lápis: quem edita clica na linha, como nas outras tabelas",
);
/* As tabelas têm cabeçalho de coluna, como Clientes e Membros. */
conferir(
  await pagina.getByRole("columnheader", { name: "Categoria" }).isVisible(),
  "a lista é TABELA, com cabeçalho de coluna",
);
conferir(
  !(await existe(pagina.getByText("Só quem administra o grupo pode alterar o catálogo."))),
  "e não vê o aviso de somente leitura",
);

console.log("\n— o modal de categoria —");
await pagina.getByRole("button", { name: "+ Nova categoria" }).click();
await pagina.getByRole("dialog").waitFor();
conferir(true, "o modal abre");
await pagina.getByRole("button", { name: "Salvar", exact: true }).click();
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
await pagina.getByRole("button", { name: "Salvar", exact: true }).click();
await acharNaLista(`${MARCA} categoria`);
conferir(true, "a categoria nova aparece na lista");

console.log("\n— o modal de conta —");
/* ⚠️ O véu do modal anterior tem de SUMIR antes: `waitFor` da linha nova
   passa assim que ela entra na lista, com o diálogo ainda fechando, e os
   cliques seguintes batem no véu ("intercepts pointer events"). */
await pagina.getByRole("heading", { name: "Nova categoria" }).waitFor({ state: "detached" });
await pagina.getByRole("button", { name: "Contas" }).click();
await pagina.getByRole("button", { name: "+ Nova conta" }).click();
await pagina.getByRole("dialog").waitFor();
/* ⚠️ Pelo PAPEL, e não por `getByLabel(/Banco/)`: com uma conta chamada
   "Banco do Brasil" na lista, o rótulo casa também com o botão de desativar
   dela, e o Playwright recusa o seletor ambíguo em vez de escolher um. */
const campoBanco = () => pagina.getByRole("textbox", { name: "Banco", exact: true });
conferir(await campoBanco().isVisible(), "conta corrente PEDE os dados bancários");
await pagina.getByLabel(/Tipo/).click();
await pagina.getByRole("option", { name: "Outros" }).click();
conferir(
  !(await existe(campoBanco())),
  "🔴 e 'Outros' esconde os três -- caixa não tem agência",
);
/* ⚠️ Espera o modal da CATEGORIA sumir de verdade antes de seguir: o
   `waitFor` da linha do catálogo passa assim que a linha entra na lista, e o
   véu do modal ainda está fechando -- os cliques seguintes batem nele. */
await pagina.getByLabel(/Nome/).fill(`${MARCA} conta`);
await pagina.getByLabel(/Saldo inicial/).fill("1.234,56");
await pagina.getByRole("button", { name: "Salvar", exact: true }).click();
await acharNaLista(`${MARCA} conta`);
conferir(
  await pagina.getByText("R$ 1.234,56").first().isVisible(),
  "o saldo digitado vira centavos e volta formatado -- 1.234,56",
);

console.log("\n— o centro de custo —");
await pagina.getByRole("button", { name: "Centros de custo" }).click();
await pagina.getByRole("button", { name: "+ Novo centro de custo" }).click();
await pagina.getByRole("dialog").waitFor();
conferir(true, "🔴 abre MODAL, igual às duas irmãs -- revisão do achado 10 do plano");
await pagina.getByLabel(/Nome/).fill(`${MARCA} centro`);
await pagina.getByRole("button", { name: "Salvar", exact: true }).click();
await acharNaLista(`${MARCA} centro`);
conferir(true, "o centro novo aparece na lista");

console.log("\n— editar é mais que renomear —");
await pagina.getByRole("button", { name: "Categorias" }).click();
await pagina.getByText(`${MARCA} categoria`).click();
await pagina.getByRole("dialog").waitFor();
conferir(
  await pagina.getByRole("group", { name: "Cor da categoria" }).isVisible(),
  "o modal de EDIÇÃO traz a paleta",
);
conferir(
  await pagina.getByLabel("Agrupador").isVisible(),
  "e o agrupador",
);
conferir(
  !(await existe(pagina.getByLabel(/Natureza/))),
  "🔴 mas NÃO a natureza -- trocá-la inverteria o lado do caixa do que já foi lançado",
);
await pagina.getByRole("group", { name: "Cor da categoria" }).locator("button").nth(7).click();
await pagina.getByRole("button", { name: "Salvar", exact: true }).click();
await pagina.waitForTimeout(1200);
conferir(
  !(await existe(pagina.getByRole("dialog"))),
  "salvar a cor fecha o modal -- sem 4xx",
);

console.log("\n— contas e centros PAGINAM, categorias não —");
/* 🔴 A assimetria é o desenho: a ordem das categorias é hierárquica (filha
   logo abaixo da mãe, indentada) e a quebra de página separaria as duas. As
   outras duas são alfabéticas puras e leem o índice estreito do servidor. */
await pagina.goto(APP + "/financeiro?aba=configuracoes&secao=contas&tamanho=10");
await pagina.getByRole("columnheader", { name: "Conta", exact: true }).first().waitFor();

/* ⚠️ Pelo NÚMERO de linhas, e não pela barra: com poucos itens o `Pagination`
   some de propósito, e exigir a barra reprovaria um ambiente pequeno. O que
   se confere é que a tabela nunca passa do tamanho de página. */
const linhasDeContas = await pagina.locator("tbody tr").count();
conferir(linhasDeContas <= 10, `a página traz no máximo 10 contas -- ${linhasDeContas}`);

const dizContas = (await pagina.getByText(/Mostrando \d+ de/).first().innerText()).trim();
const [mostradas, totalContas] = dizContas.match(/\d+/g).map(Number);
conferir(
  mostradas === linhasDeContas,
  `o subcabeçalho conta as LINHAS da página, não o total -- "${dizContas}"`,
);
conferir(totalContas >= mostradas, "e o total é o do conjunto inteiro");

/* 🔴 O endereço carrega a seção E a página: sem a seção na URL, `?pagina=2`
   não diria de qual lista é, e um F5 cairia na página 2 de outra coisa. */
await pagina.goto(APP + "/financeiro?aba=configuracoes&secao=centros&tamanho=10");
await pagina.getByRole("columnheader", { name: "Centro de custo", exact: true }).first().waitFor();
conferir(true, "⚠️ `?secao=centros` abre direto na lista de centros, num F5");

/* 🔴 O par negativo do desenho: categorias NÃO tem barra de paginação, mesmo
   com 15 linhas -- mais que o tamanho de página das outras duas. */
await pagina.goto(APP + "/financeiro?aba=configuracoes");
await pagina.getByRole("columnheader", { name: "Categoria", exact: true }).first().waitFor();
const linhasDeCategorias = await pagina.locator("tbody tr").count();
conferir(
  linhasDeCategorias > 10,
  `categorias mostra TODAS as ${linhasDeCategorias} linhas, acima do tamanho de página`,
);
conferir(
  !(await existe(pagina.getByText("Por página"))),
  "🔴 e não tem barra de paginação -- o agrupador não sobrevive à quebra de página",
);

/* ⚠️ E a mãe continua colada nas filhas, que é o motivo de tudo isto. */
const nomes = await pagina.locator("tbody tr td:first-child").allInnerTexts();
const iImpostos = nomes.findIndex((n) => n.startsWith("Impostos"));
const recuos = await pagina
  .locator("tbody tr td:first-child > div")
  .evaluateAll((els) => els.map((e) => parseInt(getComputedStyle(e).paddingLeft || "0", 10)));
conferir(
  iImpostos >= 0 && recuos[iImpostos + 1] >= 20,
  `a filha vem LOGO ABAIXO da mãe, indentada -- "Impostos" na linha ${iImpostos + 1}`,
);

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
// ─────────────────────────── a aba de LANÇAMENTOS (Fase 5)
console.log("\n— Financeiro > Lançamentos —");
await pagina.goto(`${APP}/financeiro?aba=lancamentos`);
await pagina.getByRole("row").first().waitFor();

/* 🔴 A coluna de dinheiro: cabeçalho e número no MESMO eixo. O `th` estava
   fixo à esquerda e o número à direita -- o usuário pegou na tela. E o
   jsdom não resolve o CSS do Chakra, então só aqui isso se afere. */
const alinhamento = await pagina.evaluate(() => {
  const t = document.querySelector("table");
  const th = [...t.querySelectorAll("thead th")].find((e) => e.textContent.trim() === "Valor");
  const linha = t.querySelector("tbody tr");
  const td = linha.cells[linha.cells.length - 1];
  const dir = (e) => getComputedStyle(e).textAlign;
  return {
    th: dir(th), td: dir(td),
    mesmaBorda: Math.round(th.getBoundingClientRect().right)
      === Math.round(td.getBoundingClientRect().right),
    transbordou: t.scrollWidth > t.parentElement.clientWidth + 1,
    dentroDaJanela: th.getBoundingClientRect().right <= window.innerWidth,
  };
});
conferir(alinhamento.th === "right" && alinhamento.td === "right",
  "a coluna VALOR alinha à direita nos DOIS (th e td)", JSON.stringify(alinhamento));
conferir(alinhamento.mesmaBorda, "e as duas terminam no mesmo x");
conferir(!alinhamento.transbordou && alinhamento.dentroDaJanela,
  "a tabela não transborda -- a coluna de dinheiro fica na tela");

/* 🔴 A ÚLTIMA linha não desenha divisória. Cada célula declara a borda, e
   sem a regra do `tbody tr:last-child` ela risca o cartão e sobra um vão
   embaixo -- que se lê como uma linha vazia. O usuário pegou na tela. */
const divisorias = await pagina.evaluate(() => {
  const linhas = [...document.querySelectorAll("tbody tr")];
  return {
    primeira: getComputedStyle(linhas[0].cells[0]).borderBottomWidth,
    ultima: getComputedStyle(linhas[linhas.length - 1].cells[0]).borderBottomWidth,
    quantas: linhas.length,
  };
});
conferir(divisorias.ultima === "0px" && divisorias.primeira !== "0px",
  "🔴 a ÚLTIMA linha não desenha a divisória, e as outras desenham",
  JSON.stringify(divisorias));

/* Os três cards, e o clique que filtra pela NATUREZA. */
conferir(await existe(pagina.getByText("A receber · este mês")), "o card diz de QUANDO fala");
/* ⚠️ SÓ o card de "A receber": subir dois níveis pega a grade com os três, e
   os outros dois MUDAM de propósito quando o filtro entra. */
const cardAReceber = () =>
  pagina.getByRole("button").filter({ hasText: "A receber · este mês" }).first();
const antesDoClique = await cardAReceber().innerText();
await cardAReceber().click();
await pagina.waitForTimeout(900);
conferir((await cardAReceber().innerText()) === antesDoClique,
  "🔴 clicar no card NÃO muda o número dele -- ele soma por natureza e filtra por natureza",
  antesDoClique.replace(/\n+/g, " · "));
/* ⚠️ Por TEXTO, e não por papel: a pílula é o `Select` do projeto
   (react-select), e o controle dele não expõe `role="button"`.
   ⚠️ E o texto no DOM é "Tudo que entra" -- a caixa-alta vem do CSS. */
conferir(await existe(pagina.getByText("Tudo que entra")),
  "e a pílula mostra o filtro que o card aplicou -- ele não filtra em silêncio");
conferir(await existe(pagina.getByText("Em aberto").first()),
  "e a de situação também");
await pagina.goto(`${APP}/financeiro?aba=lancamentos`);
await pagina.getByRole("row").first().waitFor();

/* O menu do botão: quatro portas, cada uma com a frase do artefato. */
await pagina.getByRole("button", { name: /Novo lançamento/ }).click();
const itens = await pagina.getByRole("menuitem").allInnerTexts();
conferir(itens.length === 4, "o menu abre com as QUATRO portas", `${itens.length}`);
conferir(itens.join(" ").includes("A receber de um cliente"),
  "e cada uma explica o que é, como no artefato");
await pagina.getByText("Saída", { exact: true }).click();
await pagina.getByText("Nova saída").waitFor();
conferir(true, "escolher fecha o menu e abre o formulário");
conferir(await existe(pagina.getByLabel(/Departamento/)),
  "o formulário pede o DEPARTAMENTO, que o artefato não tinha");
await pagina.getByRole("button", { name: "Cancelar" }).click();

/* O detalhe: cartão de FORMULÁRIO, cabeçalho de detalhe, e o que não se edita. */
await pagina.getByRole("row").nth(1).click();
await pagina.getByRole("button", { name: "Salvar", exact: true }).waitFor();
conferir(/\/financeiro\/lancamentos\//.test(pagina.url()), "a linha abre o detalhe", pagina.url());
const forma = await pagina.evaluate(() => {
  const form = document.querySelector("#form-do-lancamento");
  const cartao = form.parentElement;
  const rotulo = form.querySelector("label");
  const h1 = document.querySelector("h1");
  // ⚠️ Texto CRU: a caixa-alta da etiqueta vem do CSS, não do DOM.
  const etiqueta = [...document.querySelectorAll("*")]
    .find((e) => e.children.length === 0
      && /^(em aberto|atrasado|efetivado)$/i.test(e.textContent.trim()));
  return {
    recuo: Math.round(rotulo.getBoundingClientRect().left - cartao.getBoundingClientRect().left),
    etiquetaAbaixoDoTitulo: etiqueta
      ? etiqueta.getBoundingClientRect().top >= h1.getBoundingClientRect().bottom - 2
        && etiqueta.getBoundingClientRect().top - h1.getBoundingClientRect().bottom < 30
      : false,
    situacaoTravada: document.querySelector("#det-situacao")?.disabled,
    vinculoTravado: document.querySelector("#det-vinculo")?.disabled,
  };
});
conferir(forma.recuo === 18,
  "o formulário está no cartão de FORMULÁRIO (18px), não no de tabela (4px)",
  `recuo ${forma.recuo}px`);
conferir(forma.etiquetaAbaixoDoTitulo,
  "a etiqueta de situação fica colada ao título, como no `.cab-detalhe`");
conferir(forma.situacaoTravada && forma.vinculoTravado,
  "situação e vínculo vêm travados -- o servidor não os edita");
conferir(!(await pagina.locator("#det-vencimento").isDisabled().catch(() => true)),
  "🔴 mas o VENCIMENTO é editável -- ele entrou no PATCH");
await pagina.getByRole("button", { name: /Voltar/ }).click();
await pagina.getByRole("row").first().waitFor();
conferir(pagina.url().includes("aba=lancamentos"), "e Voltar devolve à lista", pagina.url());

// ─────────────────────────── a aba de FATURAS (Fase 6)
console.log("\n— Financeiro > Faturas > Emitidas —");
await pagina.goto(`${APP}/financeiro?aba=faturas&secao=emitidas`);
await pagina.getByRole("row").first().waitFor();
await pagina.waitForTimeout(500);

/* 🔴 A lista SÓ CRESCE -- paga e cancelada continuam nela --, e por isso ela
   é paginada NO SERVIDOR. A contagem é a do total, não a das linhas: dizer
   "10 faturas emitidas" com 14 no escritório é mentira de tela.

   ⚠️ Depende de `semear_lancamentos_para_desenho.py`, que emite catorze de
   propósito: a barra só aparece acima de dez. */
const contagemDeFaturas = await pagina.getByText(/Mostrando .* de /).first().innerText();
conferir(/Mostrando \d+ de \d+ faturas emitidas/.test(contagemDeFaturas),
  "a contagem é a do TOTAL, e não a da página", contagemDeFaturas);

const barra = pagina.getByRole("button", { name: "2" });
if (await existe(barra)) {
  const medidasDaFatura = await pagina.evaluate(() => {
    const t = document.querySelector("table");
    const cabecalhos = [...t.querySelectorAll("thead th")];
    const th = cabecalhos.find((e) => e.textContent.trim() === "Valor");
    const linhas = [...t.querySelectorAll("tbody tr")];
    const ultima = linhas[linhas.length - 1];
    const td = ultima.cells[cabecalhos.indexOf(th)];
    const dir = (e) => getComputedStyle(e).textAlign;
    return {
      linhas: linhas.length,
      th: dir(th), td: dir(td),
      mesmaBorda: Math.round(th.getBoundingClientRect().right)
        === Math.round(td.getBoundingClientRect().right),
      transbordou: t.scrollWidth > t.parentElement.clientWidth + 1,
      bordaDaUltima: getComputedStyle(ultima.cells[0]).borderBottomWidth,
      bordaDaPrimeira: getComputedStyle(linhas[0].cells[0]).borderBottomWidth,
      recuo: getComputedStyle(linhas[0].cells[0]).padding,
      alturas: [...new Set(linhas.map((l) => Math.round(l.getBoundingClientRect().height)))],
    };
  });
  conferir(medidasDaFatura.th === "right" && medidasDaFatura.td === "right"
    && medidasDaFatura.mesmaBorda && !medidasDaFatura.transbordou,
    "a coluna VALOR alinha à direita nos dois e a tabela não transborda",
    JSON.stringify(medidasDaFatura));
  conferir(medidasDaFatura.bordaDaUltima === "0px" && medidasDaFatura.bordaDaPrimeira !== "0px",
    "a ÚLTIMA linha não desenha a divisória");
  conferir(medidasDaFatura.recuo === "13px 14px" && medidasDaFatura.alturas.length === 1,
    "recuo de 13px 14px e altura uniforme", `${medidasDaFatura.recuo} / ${medidasDaFatura.alturas}`);

  await barra.click();
  await pagina.waitForTimeout(800);
  conferir(pagina.url().includes("pagina=2"), "clicar na página 2 a põe no ENDEREÇO", pagina.url());

  /* 🔴 Trocar o período apaga a página: a 4ª de "todos" quase nunca existe
     em "este mês", e o servidor devolveria uma lista vazia sem nada na tela
     explicando por quê. */
  await pagina.getByText("Todos os períodos").first().click();
  await pagina.getByRole("dialog").waitFor();
  await pagina.getByRole("dialog").getByRole("button", { name: "Este mês" }).click();
  await pagina.waitForTimeout(800);
  conferir(!pagina.url().includes("pagina=2"),
    "🔴 e trocar o PERÍODO apaga a página", pagina.url());
} else {
  conferir(true, "menos de 11 faturas: a barra some sozinha (rode a semente de desenho)");
}

/* O par negativo da assimetria: "A faturar" é o que está aberto HOJE, e
   encolhe conforme se cobra -- não é lista que cresça, e não pagina. */
await pagina.goto(`${APP}/financeiro?aba=faturas`);
await pagina.getByRole("row").first().waitFor();
await pagina.waitForTimeout(400);
conferir(!(await existe(pagina.getByText(/Por página/).first())),
  "⚠️ 'A faturar' NÃO tem barra de paginação -- o par negativo");

/* 🔴 A CAIXA DE MARCAR do modal de emissão, medida.
   Ela saía preta (#18181b): o preenchimento vem de `colorPalette.solid`, o
   projeto nunca declarou a paleta `brand`, e o Chakra caiu no cinza dele.
   O usuário pegou olhando a tela.

   ⚠️ E só se afere AQUI. A primeira correção foi na receita `checkmark`,
   que tem exatamente as chaves certas -- mas a do `checkbox` copia as dela
   no carregamento do módulo, e a cor na tela não mudou um pixel. Um teste
   de unidade sobre o tema passaria verde nas duas versões. */
await pagina.getByRole("row").nth(1).click();
await pagina.getByText(/Emitir fatura ·/).waitFor();
await pagina.waitForTimeout(400);
const caixa = await pagina.evaluate(() => {
  const c = document.querySelector('[data-scope="checkbox"][data-part="control"]');
  const e = getComputedStyle(c);
  const marca = getComputedStyle(document.documentElement)
    .getPropertyValue("--chakra-colors-fg-brand").trim();
  const paraRgb = (hex) => {
    const h = hex.replace("#", "");
    return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
  };
  return {
    fundo: e.backgroundColor, borda: e.borderColor, glifo: e.color,
    marcaEmRgb: paraRgb(marca), estado: c.getAttribute("data-state"),
    accentDoNativo: getComputedStyle(document.querySelector('input[type="checkbox"]')).accentColor,
  };
});
conferir(caixa.estado === "checked" && caixa.fundo === caixa.marcaEmRgb
  && caixa.borda === caixa.marcaEmRgb,
  "🔴 a caixa marcada é a cor da MARCA, e não o preto da lib", JSON.stringify(caixa));
conferir(caixa.glifo === "rgb(255, 255, 255)", "e o tique é branco sobre ela", caixa.glifo);
conferir(caixa.accentDoNativo === caixa.marcaEmRgb,
  "⚠️ e o checkbox NATIVO (MultiSelect) usa a mesma marca -- `auto` seria o azul do sistema",
  caixa.accentDoNativo);
await pagina.getByRole("button", { name: /Cancelar/ }).click();

// ─────────────────────────── o DOCUMENTO da fatura (Fase 6)
console.log("\n— Financeiro > Fatura > documento —");
await pagina.goto(`${APP}/financeiro?aba=faturas&secao=emitidas`);
await pagina.getByRole("row").first().waitFor();
await pagina.waitForTimeout(500);
const emAberto = pagina.locator("tbody tr").filter({ hasText: "EM ABERTO" }).first();
if (await existe(emAberto)) {
  await emAberto.click();
  await pagina.getByRole("heading", { level: 1 }).waitFor();
  await pagina.waitForTimeout(600);
  conferir(/\/financeiro\/faturas\//.test(pagina.url()),
    "a linha abre o documento, e o endereço é dele", pagina.url());

  const acoes = (await pagina.locator("main button").allInnerTexts()).filter(Boolean);
  conferir(acoes.includes("Cancelar fatura") && acoes.includes("Registrar pagamento")
    && acoes.includes("Imprimir"),
    "a ABERTA tem os três botões", acoes.join(" | "));

  /* 🔴 Dois cartões IRMÃOS, e não um dentro do outro. A tela nasceu com o
     `CartaoDeTabela` dentro de um `Cartao`, o que desenhava moldura dentro
     de moldura e colava os campos na borda da tabela. O usuário pegou. */
  const cartoes = await pagina.evaluate(() => {
    const tabela = document.querySelector("main table");
    const daTabela = tabela.closest("[class]").parentElement;
    return {
      aninhado: Boolean(daTabela.closest("div")?.parentElement?.querySelector("table")
        && daTabela.parentElement?.getAttribute("class")?.includes("card")),
      /* A grade dos dados: duas colunas e respiro vertical. */
      ...(() => {
        const grade = [...document.querySelectorAll("main div")].find(
          (e) => getComputedStyle(e).display === "grid" && e.textContent.includes("Cliente"));
        const g = getComputedStyle(grade);
        const rotulos = [...document.querySelectorAll("main p")]
          .filter((r) => ["Cliente", "Vencimento"].includes(r.textContent.trim()));
        return {
          colunas: g.gridTemplateColumns.split(" ").length,
          rowGap: g.rowGap,
          ladoALado: Math.round(rotulos[0].getBoundingClientRect().top)
            === Math.round(rotulos[1].getBoundingClientRect().top),
        };
      })(),
    };
  });
  conferir(cartoes.colunas === 2 && cartoes.ladoALado,
    "os dados vão em DUAS colunas", JSON.stringify(cartoes));
  conferir(cartoes.rowGap !== "0px",
    "🔴 e com respiro vertical -- `LinhaDeCampos` tem rowGap 0, e `CampoDeLeitura` não traz margem",
    cartoes.rowGap);

  /* 🔴 O PAPEL. Nada disto se afere em jsdom: media query não existe lá, e o
     `emulateMedia` é o único jeito de ver o que sai da impressora. */
  await pagina.emulateMedia({ media: "print" });
  await pagina.waitForTimeout(300);
  const papel = await pagina.evaluate(() => {
    const visivel = (s) => {
      const e = document.querySelector(s);
      return e ? getComputedStyle(e).display !== "none" : null;
    };
    const grade = [...document.querySelectorAll("main div")].find(
      (e) => getComputedStyle(e).display === "grid" && e.textContent.includes("Cliente"));
    return {
      menu: visivel("aside"), topo: visivel("header"), documento: visivel("table"),
      acoesEscondidas: [...document.querySelectorAll("[data-fora-da-impressao]")]
        .every((e) => getComputedStyle(e).display === "none"),
      fundo: getComputedStyle(document.body).backgroundColor,
      recuoDoMain: getComputedStyle(document.querySelector("main")).padding,
      colunasDosDados: getComputedStyle(grade).gridTemplateColumns.split(" ").length,
    };
  });
  conferir(papel.menu === false && papel.topo === false && papel.acoesEscondidas,
    "no PAPEL somem o menu, o topo e as ações", JSON.stringify(papel));
  conferir(papel.documento === true, "e o documento fica");
  conferir(papel.fundo === "rgb(255, 255, 255)",
    "🔴 o fundo do papel é BRANCO -- o `bg.canvas` do body vem depois e vencia", papel.fundo);
  conferir(papel.recuoDoMain === "0px", "e o recuo do `main` some", papel.recuoDoMain);
  conferir(papel.colunasDosDados === 2,
    "🔴 e os dados seguem em DUAS colunas -- o breakpoint do Chakra é `@media screen` e desabava no papel",
    `${papel.colunasDosDados}`);
  await pagina.emulateMedia({ media: "screen" });

  /* A paga perde os dois que mexem em dinheiro. */
  await pagina.goto(`${APP}/financeiro?aba=faturas&secao=emitidas`);
  await pagina.getByRole("row").first().waitFor();
  await pagina.waitForTimeout(500);
  const paga = pagina.locator("tbody tr").filter({ hasText: "PAGA" }).first();
  if (await existe(paga)) {
    await paga.click();
    await pagina.getByRole("heading", { level: 1 }).waitFor();
    await pagina.waitForTimeout(600);
    const acoesDaPaga = (await pagina.locator("main button").allInnerTexts()).filter(Boolean);
    conferir(!acoesDaPaga.includes("Cancelar fatura")
      && !acoesDaPaga.includes("Registrar pagamento")
      && acoesDaPaga.includes("Imprimir"),
      "🔴 a PAGA fica só com Imprimir", acoesDaPaga.join(" | "));
  }
} else {
  conferir(true, "nenhuma fatura em aberto na base (rode a semente de desenho)");
}

// ─────────────────────────── a aba de FLUXO DE CAIXA (Fase 6)
console.log("\n— Financeiro > Fluxo de caixa —");
await pagina.goto(`${APP}/financeiro?aba=fluxo`);
await pagina.getByRole("table").waitFor();
await pagina.waitForTimeout(700);

const fluxo = await pagina.evaluate(() => {
  const linhas = [...document.querySelectorAll("tbody tr")]
    .map((l) => l.cells[0]?.textContent.trim());
  const th = [...document.querySelectorAll("thead th")];
  const corrente = th.find((c) => c.textContent.includes("REALIZADO + PREVISTO"));
  const passada = th.find((c) => /^[A-Z]{3} \d{4}REALIZADO$/.test(c.textContent.trim()));
  const fixa = document.querySelector("tbody th, tbody td");
  return {
    ordem: linhas,
    primeiroCabecalho: th[0]?.textContent.trim(),
    legenda: document.querySelector("table").parentElement.querySelector("p")?.textContent ?? "",
    fundoDaPrevisao: corrente ? getComputedStyle(corrente).backgroundColor : null,
    fundoDaRealizada: passada ? getComputedStyle(passada).backgroundColor : null,
    colunaFixa: fixa ? getComputedStyle(fixa).position : null,
    recuo: fixa ? getComputedStyle(fixa).padding : null,
    /* A faixa de ENTRADAS atravessa a tabela: uma célula com colSpan. */
    faixaAtravessa: [...document.querySelectorAll("tbody td")]
      .some((c) => c.textContent.trim() === "ENTRADAS" && Number(c.getAttribute("colspan")) > 3),
  };
});
conferir(fluxo.primeiroCabecalho === "DESCRIÇÃO",
  "a primeira coluna se chama DESCRIÇÃO, como no artefato", fluxo.primeiroCabecalho);
conferir(/REALIZADO ATÉ .* PREVISTO DE .* EM DIANTE/.test(fluxo.legenda),
  "🔴 a legenda diz até onde é fato e de onde é palpite", fluxo.legenda);
conferir(fluxo.ordem[0] === "Saldo anterior"
  && fluxo.ordem.indexOf("ENTRADAS") < fluxo.ordem.indexOf("Total de entradas")
  && fluxo.ordem.indexOf("Total de saídas") < fluxo.ordem.indexOf("SALDO")
  && fluxo.ordem[fluxo.ordem.length - 1] === "Saldo final",
  "🔴 a ordem é a da leitura: de onde parti, o que entrou, o que saiu, onde cheguei",
  fluxo.ordem.filter((r) => r === r.toUpperCase()).join(" > "));
conferir(fluxo.faixaAtravessa, "a faixa da seção atravessa a tabela inteira");
conferir(fluxo.fundoDaPrevisao === "rgb(253, 241, 222)" && fluxo.fundoDaRealizada === "rgba(0, 0, 0, 0)",
  "🔴 a coluna de PREVISÃO tem fundo âmbar e a realizada não",
  `${fluxo.fundoDaPrevisao} x ${fluxo.fundoDaRealizada}`);
conferir(fluxo.colunaFixa === "sticky",
  "a primeira coluna fica na rolagem horizontal", fluxo.colunaFixa);
conferir(fluxo.recuo === "13px 14px", "e o recuo é 13px 14px", fluxo.recuo);

/* Dobrar esconde as categorias e mantém o total. */
const antesDeDobrar = await pagina.locator("tbody tr").count();
await pagina.getByRole("button", { name: /SAÍDAS/ }).click();
await pagina.waitForTimeout(400);
const depoisDeDobrar = await pagina.locator("tbody tr").count();
conferir(depoisDeDobrar < antesDeDobrar
  && (await existe(pagina.getByText("Total de saídas"))),
  "🔴 dobrar SAÍDAS esconde as categorias e mantém o total",
  `${antesDeDobrar} -> ${depoisDeDobrar}`);
await pagina.getByRole("button", { name: /SAÍDAS/ }).click();

/* O botão de exportar: branco sobre o canvas, com ícone. */
const exportar = await pagina.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Exportar"));
  return b ? { bg: getComputedStyle(b).backgroundColor, temIcone: Boolean(b.querySelector("svg")) } : null;
});
conferir(exportar?.bg === "rgb(255, 255, 255)",
  "🔴 'Exportar planilha' é BRANCO -- `transparent` sobre o canvas saía cinza",
  exportar?.bg);
conferir(exportar?.temIcone === true, "e leva o ícone de baixar, como no artefato");

// ─────────────────────────── o Financeiro na HOME (Fase 7)
console.log("\n— Área de trabalho > Financeiro —");
await pagina.goto(`${APP}/`);
await pagina.getByText("Resumo rápido").waitFor();
await pagina.waitForTimeout(1500);

const home = await pagina.evaluate(() => {
  const linha = (rotulo) => {
    const e = [...document.querySelectorAll("button, div")].find(
      (x) => x.children.length === 2 && x.textContent?.startsWith(rotulo));
    return e ? e.textContent : null;
  };
  const cabecalhos = [...document.querySelectorAll("h3")].map((h) => h.textContent?.trim());
  /* ⚠️ DENTRO do cartão "Resumo rápido", e não no documento: o menu lateral
     também tem um "Financeiro", e ele vem antes no DOM.
     ⚠️ E a caixa-alta é do CSS (`text-transform`), então o `textContent` vem
     em caixa mista -- comparar com "FINANCEIRO" nunca casaria. */
  const cartao = [...document.querySelectorAll("h3")]
    .find((h) => h.textContent?.trim() === "Resumo rápido")?.closest("div")?.parentElement;
  const rotulos = [...(cartao?.querySelectorAll("p") ?? [])]
    .map((x) => x.textContent?.trim().toUpperCase());
  return {
    rotulosDoResumo: rotulos.filter((r) => ["PRECISA DE ATENÇÃO", "FINANCEIRO", "PANORAMA"].includes(r ?? "")),
    aReceber: linha("A receber atrasado"),
    aPagar: linha("A pagar até"),
    saldo: linha("Saldo das contas"),
    cabecalhos,
  };
});
conferir(home.rotulosDoResumo.join(" > ") === "PRECISA DE ATENÇÃO > FINANCEIRO > PANORAMA",
  "🔴 a seção Financeiro fica ENTRE atenção e panorama",
  home.rotulosDoResumo.join(" > "));
conferir(/R\$/.test(home.aReceber ?? ""), "a linha 'A receber atrasado' mostra DINHEIRO", home.aReceber);
conferir(/A pagar até \d+ dias/.test(home.aPagar ?? ""),
  "🔴 e o rótulo diz 'até', não 'em' -- a soma não tem limite inferior", home.aPagar);
conferir(/R\$|Nenhuma conta/.test(home.saldo ?? ""),
  "e o saldo mostra o valor ou diz que não há conta", home.saldo);
conferir(home.cabecalhos.includes("Vence esta semana"),
  "o card 'Vence esta semana' está na tela", home.cabecalhos.join(" | "));

/* 🔴 O clique tem de abrir a lista que gerou o número. */
await pagina.getByRole("button", { name: /A pagar até/ }).click();
await pagina.waitForTimeout(1800);
conferir(pagina.url().includes("vencendo=7") && pagina.url().includes("natureza=saida"),
  "🔴 'A pagar' abre a lista com `vencendo`, e não com um período", pagina.url());
conferir(await existe(pagina.getByText(/Vence até 7 dias/)),
  "e a tela DIZ o filtro que recebeu -- ele não filtra em silêncio");

await pagina.goto(`${APP}/`);
await pagina.getByText("Resumo rápido").waitFor();
await pagina.waitForTimeout(1500);
await pagina.getByRole("button", { name: /A receber atrasado/ }).click();
await pagina.waitForTimeout(1800);
conferir(pagina.url().includes("situacao=atrasado") && pagina.url().includes("periodo=todos"),
  "🔴 'A receber atrasado' abre com período TODOS -- atrasado não é deste mês",
  pagina.url());

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
