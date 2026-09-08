/** A conferência de PRODUÇÃO que roda DEPOIS DE TODO DEPLOY do front.
 *
 *   node scripts/verificar-deploy-em-producao.mjs                 # confere e fecha
 *   node scripts/verificar-deploy-em-producao.mjs --deixar-aberto # confere e deixa a janela
 *
 * 🔴 **Só LÊ.** Nenhuma tela aqui grava nada -- ao contrário de
 * `verificar-producao.mjs`, que envia um documento de verdade e o apaga
 * depois. Esta pode rodar quantas vezes quiser, a qualquer hora.
 *
 * 🔴 **O login sai de `sessaoDeProducao.mjs`**, que reaproveita a sessão
 * guardada: a senha é digitada uma vez e as rodadas seguintes custam ZERO
 * tentativa. A conta bloqueia em 5.
 *
 * ⚠️ **O que ele cobre é o que sobrevive ao build**: rótulo, ausência de
 * rótulo e forma da célula. Comportamento é do vitest; a integração com o S3
 * é do `verificar-producao.mjs`. Aqui a pergunta é uma só -- *o que subiu é o
 * que eu escrevi?*
 */
import { abrirProducaoLogado, APP } from "./sessaoDeProducao.mjs";

const deixarAberto = process.argv.includes("--deixar-aberto");
const problemas = [];
const conferir = (ok, oQue) => {
  console.log(`${ok ? "  ok  " : "FALHA "} ${oQue}`);
  if (!ok) problemas.push(oQue);
};

const { navegador, pagina } = await abrirProducaoLogado();

/** Nenhuma tela pode trazer o texto aposentado. */
const semOpcional = async (onde) =>
  conferir((await pagina.getByText("(opcional)").count()) === 0, `${onde}: nenhum "(opcional)"`);

// ── Perfil: o rótulo e o "i" ─────────────────────────────────────────────
console.log("\n-- Perfil > Meus dados --");
await pagina.goto(`${APP}/perfil`);
await pagina.getByRole("textbox", { name: /Nome completo/ }).waitFor();
conferir(true, 'o campo se chama "Nome completo"');
conferir(
  (await pagina.getByLabel("Apelido").count()) === 0,
  'e "Apelido" não está mais na tela',
);
conferir(
  (await pagina.getByRole("button", { name: /Por que o nome completo importa/ }).count()) === 1,
  'o "i" explica por que o nome completo importa',
);
await semOpcional("Perfil");

// ── Clientes: os três campos que perderam o "(opcional)" ────────────────
console.log("\n-- Clientes > Novo cliente --");
await pagina.goto(`${APP}/clientes`);
await pagina.getByRole("button", { name: /Novo cliente/i }).first().click();
await pagina.getByRole("textbox", { name: /^Nome/ }).waitFor();
for (const rotulo of ["CPF/CNPJ", "Telefone", "E-mail"]) {
  conferir(
    (await pagina.getByLabel(rotulo, { exact: true }).count()) >= 1,
    `"${rotulo}" existe sem o sufixo`,
  );
}
conferir(
  (await pagina.getByText("Endereço", { exact: true }).count()) >= 1,
  'a seção se chama "Endereço", sem sufixo',
);
await semOpcional("Novo cliente");

// ── 🔴 a guarda de descarte, que é o que esta entrega subiu ─────────────
console.log("\n-- Novo cliente > guarda de descarte --");
/* ⚠️ Continua sem GRAVAR nada: digitar e responder "Continuar preenchendo"
   não manda requisição nenhuma. */
await pagina.getByRole("textbox", { name: /^Nome/ }).fill("VERIFICACAO AUTOMATICA");
await pagina.keyboard.press("Escape");
conferir(
  await pagina.getByText("Sair sem salvar?").isVisible().catch(() => false),
  "🔴 com o formulário mexido, o Escape PERGUNTA",
);
await pagina.getByRole("button", { name: "Continuar preenchendo" }).click();
conferir(
  (await pagina.getByRole("textbox", { name: /^Nome/ }).inputValue()) === "VERIFICACAO AUTOMATICA",
  "e voltar preserva o que foi digitado",
);
await pagina.getByRole("textbox", { name: /^Nome/ }).fill("");
await pagina.keyboard.press("Escape");
conferir(
  (await pagina.getByRole("textbox", { name: /^Nome/ }).count()) === 0,
  "⚠️ e com o campo limpo de novo, sai direto -- o par negativo",
);

// ── Grupo > Subgrupos: só a contagem de membros na linha ──────────────────
console.log("\n-- Grupo > Subgrupos --");
await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Subgrupos" }).click();
await pagina.getByRole("button", { name: /^Ver membros de / }).first().waitFor();
const portasDeMembros = await pagina.getByRole("button", { name: /^Ver membros de / }).allInnerTexts();
conferir(portasDeMembros.every((t) => /^\d+ membros?$/.test(t.trim())), "cada linha mostra a contagem de membros", portasDeMembros.slice(0, 3).join(" | "));
conferir(!/\d+ colunas?/.test(await pagina.evaluate(() => document.body.innerText)), "e não mostra contagem de colunas");

// ── Grupo > Membros: a coluna Subgrupo resumida ─────────────────────────
console.log("\n-- Grupo > Membros --");
await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Membros" }).click();
await pagina.getByRole("columnheader", { name: "Subgrupo" }).waitFor();
conferir(true, 'a coluna se chama "Subgrupo"');

const linhas = await pagina.locator("tbody tr").all();
/* 🔴 A régua desenha etiqueta ou travessão -- NUNCA nomes unidos por
   vírgula, que era o formato antigo. Uma vírgula na célula é o sinal de que
   o bundle velho ainda está no ar. */
let comVirgula = 0;
for (const l of linhas) {
  const celula = (await l.locator("td").nth(3).innerText()).trim();
  if (celula.includes(",")) comVirgula += 1;
}
conferir(comVirgula === 0, `nenhuma célula com a lista unida por vírgula (${linhas.length} linhas)`);

/* A razão do teto, medida: as linhas têm todas a mesma altura. */
const alturas = [];
for (const l of linhas) alturas.push(Math.round((await l.boundingBox()).height));
conferir(
  new Set(alturas).size <= 2,
  `as linhas têm altura uniforme (${[...new Set(alturas)].join("/")}px)`,
);

// ── Grupo > Inscrições na OAB: a mesma régua ────────────────────────────
console.log("\n-- Grupo > Inscrições na OAB --");
await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
await pagina.getByText("Inscrições da OAB").waitFor();
conferir(
  (await pagina.getByRole("tab", { name: "Inscrições na OAB" }).count()) === 1,
  "a aba abre sem erro",
);
await semOpcional("Inscrições");

// ── Financeiro: a tela que a Fase 4 subiu ───────────────────────────────
/* ⚠️ Só o que NÃO depende de dado: o grupo de produção não tem catálogo
   semeado (`semear_padrao` não é chamado ao criar grupo), e um roteiro que
   só confere quando há linha é um roteiro que passa cego. O cabeçalho da
   tabela e o modal de criar existem com a lista vazia. Clique de linha,
   edição e alinhamento são de `verificar-financeiro.mjs`, contra o offline. */
console.log("\n-- Financeiro --");
await pagina.goto(`${APP}/financeiro`);
await pagina.getByRole("tab", { name: "Configurações" }).waitFor();
for (const aba of ["Lançamentos", "Faturas", "Fluxo de caixa", "Configurações"]) {
  conferir((await pagina.getByRole("tab", { name: aba }).count()) === 1, `a aba "${aba}" está na tela`);
}

/* 🔴 **Nenhuma aba é mais pendente.** Esta checagem cobrava a frase "ainda
   não está disponível" -- era Lançamentos até a Fase 5, depois Faturas e
   Fluxo. Na Fase 6 as quatro ficaram prontas, e a asserção velha passou a
   FALHAR em produção com tudo certo.

   ⚠️ A lição vale mais que a linha: checagem que descreve um estado
   TRANSITÓRIO ("ainda não chegou") tem prazo de validade, e quem a escreve
   precisa deixar claro o que fazer quando ele vence. O que ficou no lugar é
   o par negativo dela, que não vence: nenhuma aba diz isso. */
await pagina.getByRole("tab", { name: "Faturas" }).click();
await pagina.waitForTimeout(1500);
conferir(
  (await pagina.getByText(/ainda não está disponível/).count()) === 0,
  "🔴 nenhuma aba diz mais 'ainda não está disponível' -- as quatro estão prontas",
);

console.log("\n-- Financeiro > Configurações --");
await pagina.getByRole("tab", { name: "Configurações" }).click();

/* 🔴 As três listas ficam atrás de PÍLULAS -- uma por vez na tela, e não as
   três empilhadas. Foi o que derrubou a primeira versão deste bloco, que
   procurava os seis cabeçalhos de uma vez: `waitFor` num cabeçalho de outra
   seção espera 30s e morre. */
const SECOES = [
  { pilula: "Categorias", colunas: ["Categoria", "Natureza"], botao: "+ Nova categoria" },
  { pilula: "Centros de custo", colunas: ["Centro de custo"], botao: "+ Novo centro de custo" },
  { pilula: "Contas", colunas: ["Conta", "Dados bancários", "Saldo atual"], botao: "+ Nova conta" },
];

const cabecalhos = async () =>
  (await pagina.getByRole("columnheader").allInnerTexts()).map((c) => c.trim().toUpperCase());

for (const secao of SECOES) {
  await pagina.getByRole("button", { name: secao.pilula, exact: true }).click();
  await pagina.getByRole("columnheader", { name: secao.colunas[0], exact: true }).first().waitFor();
  const naTela = await cabecalhos();
  /* 🔴 As três são TABELA com cabeçalho de coluna, como Clientes e Membros.
     Um cabeçalho a menos aqui é o bundle velho no ar. */
  for (const coluna of secao.colunas) {
    conferir(naTela.includes(coluna.toUpperCase()), `${secao.pilula}: a coluna "${coluna}" tem cabeçalho`);
  }
  /* ⚠️ O par negativo, sem o qual este bloco passaria cego: as colunas das
     OUTRAS duas seções não podem estar na tela ao mesmo tempo. */
  const invasoras = SECOES.filter((o) => o !== secao)
    .flatMap((o) => o.colunas)
    .filter((c) => naTela.includes(c.toUpperCase()));
  conferir(invasoras.length === 0, `${secao.pilula}: ⚠️ e só ela na tela -- o par negativo`);
  /* 🔴 O botão fica FORA da tabela, no subcabeçalho -- inclusive o do centro
     de custo, que é a revisão do achado 10 do plano. */
  conferir(
    (await pagina.getByRole("button", { name: secao.botao, exact: true }).count()) === 1,
    `${secao.pilula}: "${secao.botao}" fica no subcabeçalho, fora da tabela`,
  );
}

/* ⚠️ Continua sem GRAVAR: abrir o modal de criar e sair no Escape com os
   campos intocados não manda requisição nenhuma nem dispara o descarte. */
await pagina.getByRole("button", { name: "Centros de custo", exact: true }).click();
await pagina.getByRole("button", { name: "+ Novo centro de custo", exact: true }).click();
conferir(
  await pagina.getByText("Novo centro de custo", { exact: true }).first().isVisible().catch(() => false),
  "🔴 centro de custo abre MODAL, e não um campo dentro do cartão",
);
await pagina.keyboard.press("Escape");

await pagina.getByRole("button", { name: "Categorias", exact: true }).click();
await pagina.getByRole("button", { name: "+ Nova categoria", exact: true }).click();
await pagina.getByText("Nova categoria", { exact: true }).first().waitFor();
/* ⚠️ Os rótulos saem do MODAL, e com o asterisco de obrigatório tirado: ele
   é um `<span aria-hidden>` dentro do `<label>`, entra no innerText, e um
   `getByText` exato não casa com "Nome *". Ler do diálogo também evita casar
   com um "Natureza" que esteja na tabela atrás. */
const modal = pagina.locator('[role="dialog"]');
const rotulos = (await modal.locator("label").allInnerTexts()).map((r) =>
  r.replace(/\s*\*$/, "").trim(),
);
for (const campo of ["Nome", "Natureza", "Cor", "Agrupador"]) {
  conferir(rotulos.includes(campo), `o modal da categoria tem "${campo}"`);
}
/* ⚠️ O par negativo do modal: na CRIAÇÃO a natureza aparece; quem prova que
   a lista acima não é decorativa é ela sumir na EDIÇÃO -- e isso é do
   `verificar-financeiro.mjs`, que tem item para clicar. */
await pagina.keyboard.press("Escape");
/* ── contas e centros PAGINAM; categorias, não ─────────────────────────
   ⚠️ Em produção contas e centros estão VAZIOS, então nada aqui depende de
   linha: o que se confere é o endereço abrir a lista certa, e o par negativo
   de categorias, que tem as 15 do seed -- mais que o tamanho de página. */
console.log("\n-- Financeiro > paginação --");
await pagina.goto(`${APP}/financeiro?aba=configuracoes&secao=contas`);
await pagina.getByRole("columnheader", { name: "Conta", exact: true }).first().waitFor();
conferir(true, "⚠️ `?secao=contas` abre direto na lista de contas, num F5");

await pagina.goto(`${APP}/financeiro?aba=configuracoes&secao=centros`);
await pagina.getByRole("columnheader", { name: "Centro de custo", exact: true }).first().waitFor();
conferir(true, "e `?secao=centros` na de centros");

await pagina.goto(`${APP}/financeiro?aba=configuracoes`);
await pagina.getByRole("columnheader", { name: "Categoria", exact: true }).first().waitFor();
const linhasDeCategorias = await pagina.locator("tbody tr").count();
conferir(
  linhasDeCategorias > 10,
  `🔴 categorias mostra TODAS as ${linhasDeCategorias} linhas, acima do tamanho de página`,
);
conferir(
  (await pagina.getByText("Por página").count()) === 0,
  "🔴 e NÃO tem barra de paginação -- o agrupador não sobrevive à quebra de página",
);

/* ⚠️ E a razão disso, na tela: a filha continua colada na mãe, indentada. */
const nomesDasCategorias = await pagina.locator("tbody tr td:first-child").allInnerTexts();
const recuos = await pagina
  .locator("tbody tr td:first-child > div")
  .evaluateAll((els) => els.map((e) => parseInt(getComputedStyle(e).paddingLeft || "0", 10)));
const iMae = nomesDasCategorias.findIndex((n) => n.startsWith("Impostos"));
conferir(
  iMae >= 0 && recuos[iMae + 1] >= 20,
  `a filha vem LOGO ABAIXO da mãe, indentada -- "Impostos" na linha ${iMae + 1}`,
);

await semOpcional("Financeiro");

// ── Financeiro > Lançamentos: a Fase 5 ──────────────────────────────────
console.log("\n-- Financeiro > Lançamentos --");
await pagina.goto(`${APP}/financeiro?aba=lancamentos`);
await pagina.getByRole("button", { name: /Novo lançamento/ }).waitFor();
conferir(true, "a aba abre -- deixou de ser pendente");
conferir(
  (await pagina.getByText("Lançamentos ainda não está disponível.").count()) === 0,
  "e não diz mais que não chegou",
);

/* 🔴 A coluna de dinheiro alinhada nos DOIS. É o defeito que o usuário pegou,
   e é `textAlign` -- classe do Chakra, que o jsdom não resolve. Só aqui e no
   roteiro do offline isso se afere.

   ⚠️ Produção pode não ter lançamento nenhum: então o que se confere é o
   CABEÇALHO, que existe de qualquer jeito. */
/* ⚠️ Espera a LISTA chegar antes de medir: ou a tabela, ou o estado vazio.
   Sem isto a medição acontece com a consulta em voo e acusa "sem tabela"
   num lugar onde ela vai existir. */
await pagina
  .locator("table")
  .or(pagina.getByText("Nenhum lançamento neste período."))
  .first()
  .waitFor();

const alinhamento = await pagina.evaluate(() => {
  const th = [...document.querySelectorAll("thead th")]
    .find((e) => e.textContent.trim() === "Valor");
  const linha = document.querySelector("tbody tr");
  const td = linha?.cells?.[linha.cells.length - 1];
  return {
    temTabela: Boolean(th),
    th: th ? getComputedStyle(th).textAlign : null,
    td: td ? getComputedStyle(td).textAlign : null,
  };
});
if (alinhamento.temTabela) {
  conferir(alinhamento.th === "right", "o cabeçalho VALOR alinha à direita");
  conferir(alinhamento.td === null || alinhamento.td === "right",
    "e a célula também, quando há linha");
} else {
  /* ⚠️ Produção ainda não tem lançamento nenhum, e `Tabela` troca a tabela
     INTEIRA pelo estado vazio (`if (vazio) return <>{vazio}</>`) -- não há
     `thead` para medir. O alinhamento é aferido no offline, com a base
     semeada (`verificar-financeiro.mjs`); aqui o que se confere é que a tela
     diz por que está vazia, em vez de mostrar uma tabela sem linhas. */
  conferir(
    await pagina.getByText("Nenhum lançamento neste período.").isVisible().catch(() => false),
    "sem lançamento nenhum, a tela DIZ isso -- e não há tabela para alinhar",
  );
}

/* O menu das quatro portas, e o formulário com o departamento. */
await pagina.getByRole("button", { name: /Novo lançamento/ }).click();
conferir((await pagina.getByRole("menuitem").count()) === 4,
  "o menu abre com as QUATRO portas");
await pagina.getByText("Saída", { exact: true }).click();
await pagina.getByText("Nova saída").waitFor();
conferir((await pagina.getByLabel(/Departamento/).count()) >= 1,
  "o formulário pede o DEPARTAMENTO -- o rateio chegou à tela");
conferir((await pagina.getByRole("button", { name: "Salvar e adicionar outra" }).count()) === 1,
  'e tem o "Salvar e adicionar outra" do artefato');
await pagina.getByRole("button", { name: "Cancelar" }).click();

/* A pílula que o card usa -- ela é a prova de que o filtro por natureza subiu. */
conferir((await pagina.getByText("Entradas e saídas").count()) >= 1,
  "a pílula de natureza existe -- o filtro novo da API chegou à tela");

/* ─────────────────────── o Financeiro completo (Fase 6) ─────────────────── */
console.log("\n-- Financeiro > as quatro abas --");
await pagina.goto(`${APP}/financeiro?aba=faturas`);
await pagina.waitForTimeout(2500);
conferir((await pagina.getByText(/ainda não está disponível/).count()) === 0,
  "🔴 nenhuma aba diz mais que 'ainda não chegou' -- as quatro subiram");
conferir((await pagina.getByRole("button", { name: "Emitidas" }).count()) === 1,
  "Faturas tem as duas sub-abas");

await pagina.goto(`${APP}/financeiro?aba=faturas&secao=emitidas`);
await pagina.waitForTimeout(2500);
conferir((await pagina.getByText(/Nenhuma fatura emitida|Mostrando \d+ de/).count()) >= 1,
  "e 'Emitidas' responde -- lista ou o vazio dela");

await pagina.goto(`${APP}/financeiro?aba=fluxo`);
await pagina.waitForTimeout(3000);
conferir((await pagina.getByRole("button", { name: /Exportar planilha/ }).count()) === 1,
  "o Fluxo de caixa abre, com o botão de exportar");

/* ⚠️ **A base de produção pode estar VAZIA**, e aí a aba mostra o estado
   vazio no lugar da tabela -- foi exatamente o que aconteceu na primeira
   conferência da Fase 6, e as duas checagens abaixo falharam sem nada estar
   errado. É a mesma armadilha que a lista de Lançamentos já registra aqui:
   asserção sobre tabela só vale quando há tabela. */
const temTabelaDoFluxo = (await pagina.getByText("DESCRIÇÃO").count()) === 1;
if (temTabelaDoFluxo) {
  conferir((await pagina.getByText(/FLUXO DE CAIXA ·/).count()) === 1,
    "🔴 e traz a legenda do artefato, dizendo até onde é fato");
  conferir((await pagina.getByText(/REALIZADO/).count()) >= 1,
    "e o cabeçalho da coluna diz o que ela é");
} else {
  conferir((await pagina.getByText(/Nenhum lançamento neste período/).count()) === 1,
    "⚠️ sem lançamento nenhum, o fluxo DIZ isso -- e não há tabela para conferir");
}

/* 🔴 A caixa de marcar da paleta: medida, não olhada. Ela saía PRETA. */
await pagina.goto(`${APP}/financeiro?aba=lancamentos`);
await pagina.waitForTimeout(2500);
const caixa = await pagina.evaluate(() => {
  const marca = getComputedStyle(document.documentElement)
    .getPropertyValue("--chakra-colors-fg-brand").trim();
  const nativo = document.querySelector('input[type="checkbox"]');
  return {
    marca,
    accentDoNativo: nativo ? getComputedStyle(nativo).accentColor : null,
  };
});
conferir(caixa.marca === "#008fd5", "a marca continua #008fd5 em produção");
conferir(caixa.accentDoNativo === null || caixa.accentDoNativo === "rgb(0, 143, 213)",
  "🔴 e o checkbox nativo usa a marca -- `auto` era o azul do sistema");

/* 🔴 O botão de contorno sobre o canvas: era `transparent`, saía cinza. */
const contorno = await pagina.evaluate(() => {
  const b = [...document.querySelectorAll("button")]
    .find((x) => /Limpar filtros|Exportar/.test(x.textContent ?? ""));
  return b ? getComputedStyle(b).backgroundColor : null;
});
conferir(contorno === null || contorno === "rgb(255, 255, 255)",
  "🔴 o botão de contorno é BRANCO sobre o canvas");

/* ─────────────────── o Financeiro na Área de trabalho (Fase 7) ─────────── */
console.log("\n-- Área de trabalho > Financeiro --");
await pagina.goto(`${APP}/`);
await pagina.getByText("Resumo rápido").waitFor();
await pagina.waitForTimeout(2500);

const naHome = await pagina.evaluate(() => {
  /* ⚠️ DENTRO do cartão: o menu lateral também tem um "Financeiro", e a
     caixa-alta dos rótulos vem do CSS -- comparar com "FINANCEIRO" no
     `textContent` nunca casaria. */
  const cartao = [...document.querySelectorAll("h3")]
    .find((h) => h.textContent?.trim() === "Resumo rápido")?.closest("div")?.parentElement;
  const rotulos = [...(cartao?.querySelectorAll("p") ?? [])]
    .map((x) => x.textContent?.trim().toUpperCase());
  const linha = (inicio) => {
    const e = [...document.querySelectorAll("button, div")].find(
      (x) => x.children.length === 2 && x.textContent?.startsWith(inicio));
    return e?.textContent ?? "";
  };
  return {
    ordem: rotulos.filter((r) => ["PRECISA DE ATENÇÃO", "FINANCEIRO", "PANORAMA"].includes(r ?? "")),
    aPagar: linha("A pagar até"),
    aReceber: linha("A receber atrasado"),
    temCard: [...document.querySelectorAll("h3")].some((h) => h.textContent?.trim() === "Vence esta semana"),
  };
});
conferir(naHome.ordem.join(" > ") === "PRECISA DE ATENÇÃO > FINANCEIRO > PANORAMA",
  "🔴 a seção Financeiro fica ENTRE atenção e panorama");
conferir(/A pagar até \d+ dias/.test(naHome.aPagar),
  "🔴 o rótulo diz 'até', não 'em' -- a soma não tem limite inferior");
conferir(/R\$/.test(naHome.aReceber), "e as linhas mostram DINHEIRO");
conferir(naHome.temCard, 'o card "Vence esta semana" subiu');

/* O clique tem de abrir a lista que gerou o número. */
await pagina.getByRole("button", { name: /A pagar até/ }).click();
await pagina.waitForTimeout(2500);
conferir(pagina.url().includes("vencendo=7") && pagina.url().includes("natureza=saida"),
  "🔴 e o clique leva `vencendo`, não um período");
conferir((await pagina.getByText(/Vence até 7 dias/).count()) === 1,
  "e a tela DIZ o filtro que recebeu -- ele não filtra em silêncio");

console.log(problemas.length ? `\n${problemas.length} FALHA(S)` : "\nTudo certo em produção.");
if (deixarAberto) {
  console.log("A janela fica aberta -- feche o Chrome quando terminar.");
} else {
  await navegador.close();
  process.exit(problemas.length ? 1 : 0);
}
