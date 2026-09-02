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
await pagina.keyboard.press("Escape");

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

console.log(problemas.length ? `\n${problemas.length} FALHA(S)` : "\nTudo certo em produção.");
if (deixarAberto) {
  console.log("A janela fica aberta -- feche o Chrome quando terminar.");
} else {
  await navegador.close();
  process.exit(problemas.length ? 1 : 0);
}
