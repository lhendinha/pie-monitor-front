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

/* A aba pendente APARECE e diz que ainda não chegou -- clicar e não
   acontecer nada é que seria ruim. */
await pagina.getByRole("tab", { name: "Lançamentos" }).click();
conferir(
  await pagina.getByText("Lançamentos ainda não está disponível.").isVisible().catch(() => false),
  "⚠️ a aba pendente diz que ainda não chegou, em vez de abrir vazia",
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


console.log(problemas.length ? `\n${problemas.length} FALHA(S)` : "\nTudo certo em produção.");
if (deixarAberto) {
  console.log("A janela fica aberta -- feche o Chrome quando terminar.");
} else {
  await navegador.close();
  process.exit(problemas.length ? 1 : 0);
}
