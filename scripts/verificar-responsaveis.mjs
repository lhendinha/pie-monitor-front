/** "Quem responde, recebe", em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_responsaveis.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-responsaveis.mjs
 *
 * 🔴 O cenário são os PARES. Um processo só, com dono, passa por qualquer
 * filtro quebrado: uma listagem que devolve tudo dá o mesmo resultado de uma
 * que filtra certo. Por isso o seed tem MEU, do COLEGA e ÓRFÃO.
 *
 * ⚠️ A régua é `toBeVisible`, não "está no documento": os painéis das abas
 * vão MONTADOS de propósito, então o conteúdo dos três existe na página o
 * tempo todo.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "movida@local.test", senha: "Senha!Local1" };
const SUB = "sub-g-alfa";

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 30 });
const pagina = await (await navegador.newContext({ viewport: { width: 1500, height: 980 } })).newPage();

const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  const p = new URL(r.url()).pathname;
  if (r.status() >= 400 && !p.includes("favicon")) problemas.push(`${r.status()} ${p}`);
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome, detalhe });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

async function entrar() {
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.getByLabel(/e-mail/i).fill(CONTA.email);
  // ⚠️ Por ROLE: `getByLabel(/senha/i)` casa também com o botão "Mostrar senha".
  await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
}

await entrar();

// --- 1. a coluna --------------------------------------------------------
await pagina.goto(`${APP}/processos`, { waitUntil: "networkidle" });
await pagina.getByText("MEU processo").first().waitFor({ timeout: 15000 });

/* ⚠️ Comparado em MAIÚSCULAS, e isso é uma lição do próprio Chrome: o
   cabeçalho tem `text-transform: uppercase`, e `innerText` devolve o texto
   RENDERIZADO -- "RESPONSÁVEL", não "Responsável". Em jsdom viria como está
   no código, e a asserção passaria sem provar nada sobre a tela. */
const cabecalhos = (await pagina.locator("table thead th").allInnerTexts()).map((c) =>
  c.toLocaleUpperCase("pt-BR"),
);
conferir(cabecalhos.includes("RESPONSÁVEL"), "a coluna Responsável existe", cabecalhos.join(" | "));
conferir(
  cabecalhos.includes("ÚLTIMA MOVIMENTAÇÃO"),
  "e 'Última movimentação' NÃO saiu -- a demo trocou, o plano acrescentou",
);

const linhaMeu = pagina.locator("tr", { hasText: "MEU processo" });
conferir(
  await linhaMeu.getByText("Ana Movida").isVisible(),
  "a coluna mostra o APELIDO, não o e-mail",
);
const linhaOrfa = pagina.locator("tr", { hasText: "ORFAO sem dono" });
conferir(
  await linhaOrfa.getByText("Sem responsável").isVisible(),
  "o órfão é MARCADO, não mostra um traço como as outras colunas vazias",
);

// --- 2. os filtros ------------------------------------------------------
/** Aplica uma opção da pílula de responsável e devolve o que a tabela mostra.
 *
 * ⚠️ Recarrega antes de cada uma, e isso não é preguiça: reabrir a pílula
 * pelo valor JÁ ESCOLHIDO é ambíguo -- o texto aparece no controle e no
 * anúncio de acessibilidade --, e mirar a classe gerada pelo Emotion
 * (`css-w54w9q-...`) quebraria no próximo build. Partir do estado limpo é o
 * caminho estável. */
async function filtrarPor(opcao) {
  await pagina.goto(`${APP}/processos`, { waitUntil: "networkidle" });
  await pagina.getByText("MEU processo").first().waitFor({ timeout: 15000 });
  await pagina.getByText("Todos os responsáveis").click();
  await pagina.getByRole("option", { name: opcao }).click();
  await pagina.waitForTimeout(1200);
  return (await pagina.locator("table tbody tr").allInnerTexts()).join(" || ");
}

const meus = await filtrarPor("Meus processos");
conferir(
  meus.includes("MEU processo") && !meus.includes("Do COLEGA"),
  "'Meus processos' esconde o do colega",
  meus.includes("Do COLEGA") ? "o do colega apareceu" : "",
);

const orfaos = await filtrarPor("Sem responsável");
conferir(
  orfaos.includes("ORFAO") && !orfaos.includes("MEU processo"),
  "'Sem responsável' acha SÓ o órfão",
);

// --- 3. o campo, e o reset ao trocar de subgrupo ------------------------
await pagina.goto(`${APP}/processos/${SUB}/11111111111111111111`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);
conferir(
  await pagina.getByText("Ana Movida").first().isVisible(),
  "o detalhe mostra o responsável pelo APELIDO",
);

// --- 4. as três abas do atendimento ------------------------------------
await pagina.goto(`${APP}/atendimentos/${SUB}/at-resp`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);

const abas = await pagina.getByRole("tab").allInnerTexts();
conferir(
  abas.join("|") === "Registros|Detalhes|Documentos",
  "as três abas, com Registros PRIMEIRO",
  abas.join(" | "),
);
conferir(
  await pagina.getByRole("tab", { name: "Registros" }).getAttribute("aria-selected") === "true",
  "🔴 abre em REGISTROS -- a conversa, não o formulário",
);

// 🔴 O que só o Chrome responde: o campo EXISTE no DOM (painel montado) mas
// não pode estar VISÍVEL com a aba Registros aberta.
conferir(
  await pagina.getByLabel("Status").count() > 0
    && !(await pagina.getByLabel("Status").isVisible()),
  "o status está montado mas ESCONDIDO -- painel montado, campo invisível",
);

await pagina.getByRole("tab", { name: "Detalhes" }).click();
await pagina.waitForTimeout(600);
conferir(await pagina.getByLabel("Status").isVisible(), "na aba Detalhes o status aparece");
conferir(
  await pagina.getByRole("button", { name: "Salvar" }).isDisabled(),
  "'Salvar' começa DESABILITADO -- nada mudou ainda",
);

/* ⚠️ O `MultiSelect` não desenha uma etiqueta por pessoa: `rotuloResumo` lista
   os NOMES até dois, e só a partir de três vira "N selecionados". Com dois
   responsáveis, então, o certo é ler os dois nomes.

   🔴 Duas versões erradas antes desta, e as duas PASSAVAM: contar etiquetas
   com `>= 1` (passaria com a lista vazia mostrando o placeholder) e procurar
   "2 selecionados" (que só existe a partir de três). Asserção frouxa sobre um
   componente que não se leu é o jeito mais fácil de escrever um teste que
   não prova nada. */
const textoDoForm = await pagina.locator("form").innerText();
const depoisDoRotulo = textoDoForm.split("Responsáveis")[1] ?? "";
conferir(
  /ana movida/i.test(depoisDoRotulo) && /colega/i.test(depoisDoRotulo),
  "o campo mostra os DOIS responsáveis pelo nome",
  depoisDoRotulo.split("\n").filter(Boolean)[0] ?? "(vazio)",
);

// --- 5. salvar de verdade ----------------------------------------------
/* ⚠️ Rolado até o campo ANTES de abrir. O painel do `Select` abre pra baixo,
   e numa viewport de 980px ele nascia fora da tela -- o Playwright rolava,
   o painel reabria embaixo, e o clique ficava em laço até o timeout. É um
   defeito do ROTEIRO, não da tela: quem usa rola naturalmente. */
/* 🔴 Clicado no VALOR visível, não em `getByLabel("Status")`.
   Aquele resolve pro `dummyInput` do react-select: um input de tamanho zero,
   sempre "fora da viewport" pro Chrome. Em jsdom o clique funciona (ele não
   tem layout), e é por isso que o teste unitário usa o label e este aqui não
   pode.

   ⚠️ E o roteiro ALTERNA em vez de fixar "Fechado": ele SALVA de verdade, e
   fixar um valor o tornaria de uma execução só -- na segunda, "Em andamento"
   já não existiria na tela e o clique ficaria esperando pra sempre. Foi
   exatamente o que aconteceu. Roteiro que muda estado precisa ler o estado. */
const statusAtual = textoDoForm.includes("Fechado") ? "Fechado" : "Em andamento";
const statusNovo = statusAtual === "Fechado" ? "Em andamento" : "Fechado";
/* 🔴 Pelo id do campo, não pelo texto: o status é um `react-select`, e o texto
   do valor fica sob um contêiner que intercepta o clique -- o roteiro ficava
   58 tentativas esperando "Em andamento" ser clicável. O input do controle é
   o que abre o painel. */
const controleDeStatus = pagina.locator("#status-do-atendimento");
await controleDeStatus.scrollIntoViewIfNeeded();
await controleDeStatus.click();
await pagina.getByRole("option", { name: statusNovo }).click();
await pagina.waitForTimeout(400);
conferir(
  !(await pagina.getByRole("button", { name: "Salvar" }).isDisabled()),
  "mudando algo, 'Salvar' habilita",
  `${statusAtual} -> ${statusNovo}`,
);
await pagina.getByRole("button", { name: "Salvar" }).click();
await pagina.waitForTimeout(1500);
conferir(
  await pagina.getByText(/atualizado/i).first().isVisible().catch(() => false),
  "salvou e confirmou na tela",
);

// --- 6. o botão de excluir, igual ao do processo ------------------------
const excluir = pagina.getByRole("button", { name: /^Excluir/ });
conferir(await excluir.isVisible(), "o botão de excluir mostra o TEXTO, não só o ícone");

// --- fecho --------------------------------------------------------------
const falhas = checagens.filter((c) => !c.ok);
console.log(`\n${checagens.length - falhas.length}/${checagens.length} checagens`);
if (problemas.length) console.log("⚠️ problemas de rede/página:", [...new Set(problemas)].join(", "));
await navegador.close();
process.exit(falhas.length || problemas.length ? 1 : 0);
