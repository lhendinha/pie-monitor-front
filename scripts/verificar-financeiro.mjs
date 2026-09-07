/** A tela do Financeiro -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_papeis.py
 *      .venv/bin/python scripts/offline/semear_financeiro.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-financeiro.mjs
 *
 * 🔴 O piso do papel se verifica com TRÊS contas, não com uma. Um teste que
 * só entra como `financeiro` prova que quem pode vê -- e a metade que
 * importa é que quem NÃO pode não vê, nem digitando o endereço.
 *
 * 🔴 A cor da bolinha da categoria é MEDIDA, não olhada: ela vem da paleta
 * que os dois repositórios compartilham, e um token que não resolve pinta
 * transparente sem derrubar teste nenhum.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const SENHA = "Senha!Local1";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
const pagina = await contexto.newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 120)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login"))
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

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

// ─────────────────────────── quem PODE
console.log("— financeiro@local.test —");
await entrar("financeiro@local.test");
const noMenu = pagina.getByRole("link", { name: "Financeiro" });
conferir(await noMenu.isVisible(), "o item aparece no menu");

await noMenu.click();
await pagina.getByRole("heading", { name: "Financeiro", level: 1 }).waitFor();
conferir(
  pagina.url().endsWith("/financeiro"),
  "o clique leva a /financeiro",
  pagina.url(),
);
conferir(
  await pagina.getByText("Honorários, entradas, saídas e o caixa do escritório.").isVisible(),
  "o subtítulo é o do artefato",
);

/* As três pílulas e a troca entre elas. */
for (const rotulo of ["Categorias", "Centros de custo", "Contas"]) {
  conferir(await pagina.getByRole("button", { name: rotulo }).isVisible(), `pílula "${rotulo}"`);
}
await pagina.getByText("Honorários", { exact: true }).first().waitFor();
conferir(
  await pagina.getByText("Honorários", { exact: true }).first().isVisible(),
  "abre em Categorias, com o catálogo semeado",
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
      .filter((d) => getComputedStyle(d).width === "10px")
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

await pagina.getByRole("button", { name: "Centros de custo" }).click();
conferir(
  !(await pagina.getByText("Saldo atual").first().isVisible().catch(() => false)),
  "trocar de pílula troca a lista",
);

/* Grupo não aparece para quem é do Financeiro. */
conferir(
  !(await pagina.getByRole("link", { name: "Grupo" }).isVisible().catch(() => false)),
  "o item Grupo NÃO aparece para o papel financeiro",
);

// ─────────────────────────── quem NÃO pode
console.log("\n— user@local.test —");
await entrar("user@local.test");
conferir(
  !(await pagina.getByRole("link", { name: "Financeiro" }).isVisible().catch(() => false)),
  "o item some do menu",
);
await pagina.goto(APP + "/financeiro");
await pagina.waitForTimeout(600);
conferir(
  !pagina.url().endsWith("/financeiro"),
  "digitar o endereço NÃO entra",
  pagina.url(),
);

// ─────────────────────────── quem administra
console.log("\n— chefe@local.test —");
await entrar("chefe@local.test");
await pagina.goto(APP + "/financeiro");
/* ⚠️ Espera a LISTA, não o título: o catálogo chega por consulta, e a
   primeira versão deste teste conferiu os botões antes de eles existirem. */
await pagina.getByRole("button", { name: "Renomear Anuidade OAB" }).waitFor();
conferir(
  await pagina.getByRole("button", { name: "Renomear Anuidade OAB" }).isVisible(),
  "quem administra vê as ações de editar",
);
conferir(
  !(await pagina
    .getByText("Só quem administra o grupo pode alterar o catálogo.")
    .isVisible()
    .catch(() => false)),
  "e não vê o aviso de somente leitura",
);

console.log(
  `\n${checagens.filter((c) => !c.ok).length} falha(s) em ${checagens.length} checagens.`,
);
if (problemas.length) console.log("problemas de rede/JS:\n  " + problemas.join("\n  "));
await navegador.close();
process.exit(checagens.some((c) => !c.ok) || problemas.length ? 1 : 0);
