/** A conferência ponta a ponta do `PLANO_TRAVAS_E_TETOS.md`, num grupo de
 *  teste em produção (regra 6 da seção 0 do CONTEXT).
 *
 * 🔴 **Não é a conferência de deploy.** Esta USA o sistema: cria cliente e
 * processo PELA TELA, percorre as sete telas e afirma que NENHUMA produz
 * 422 -- o sinal de que uma trava nova mordeu quem está usando. Um 422 é
 * resposta normal, não deixa rastro em log de exceção, e é por isso que só
 * a tela o encontra.
 *
 * 🔴 **E ela achou um 500 que nenhuma das nove fases pegou:** num grupo
 * recém-criado o quadro está VAZIO, então a tela mandou `coluna_id` vazio e
 * `POST /tarefas` respondeu `500 {"detail": "Erro interno"}`. As fases
 * conferiram um escritório que já tinha dado; o primeiro uso do sistema é
 * outro caminho. Ver `min_length` em `src/api/schemas/tarefas.py`.
 *
 * ⚠️ **Num GRUPO DE TESTE, nunca no escritório real**, e o que ela cria SAI
 * inteiro -- inclusive a PESSOA:
 *
 *     # na pasta api, funda o grupo com POST /usuarios (x-api-key)
 *     .venv/bin/python scripts/apagar_grupo_de_conferencia.py GRUPO_ID --apagar
 *
 *     node scripts/conferir-travas-ponta-a-ponta.mjs caminho/do/.env
 *
 * O arquivo de ambiente traz `EMAIL`, `SENHA` e `NUMEROS` (números CNJ com
 * dígito verificador válido, um por rodada).
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const APP = "https://argos-monitor.vercel.app";
const env = Object.fromEntries(
  readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => l.split("=")),
);

const falhas = [];
const conferir = (rotulo, ok, detalhe = "") => {
  console.log(`  ${ok ? "ok " : "🔴 "}${rotulo}${detalhe ? `  ${detalhe}` : ""}`);
  if (!ok) falhas.push(rotulo);
};

const respostas = [];
const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 30 });
const contexto = await navegador.newContext({ viewport: { width: 1500, height: 1000 } });
const pagina = await contexto.newPage();
pagina.on("response", (r) => {
  const u = new URL(r.url());
  if (u.hostname.includes("lambda-url"))
    respostas.push({ metodo: r.request().method(), rota: u.pathname + u.search, status: r.status() });
});

async function esperar(casa, desde) {
  for (let i = 0; i < 120; i++) {
    const achou = respostas.slice(desde).find(casa);
    if (achou) return achou;
    await pagina.waitForTimeout(200);
  }
  return null;
}

try {
  // ── login pela TELA, uma vez ───────────────────────────────────────────
  await pagina.goto(APP);
  await pagina.getByLabel(/e-?mail/i).fill(env.EMAIL);
  await pagina.getByRole("textbox", { name: "Senha" }).fill(env.SENHA);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  const entrou = await pagina.getByText("Resumo rápido")
    .waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
  conferir("entrou no grupo de conferência", entrou);
  if (!entrou) throw new Error("login não passou -- o roteiro PARA aqui");

  // ── cria um CLIENTE pela tela ─────────────────────────────────────────
  await pagina.goto(`${APP}/clientes`);
  await pagina.getByRole("button", { name: /novo cliente/i }).click();
  await pagina.getByRole("textbox", { name: /^nome/i }).first()
    .fill(`Cliente da Conferência ${Date.now()}`);
  let desde = respostas.length;
  await pagina.getByRole("button", { name: /^(salvar|cadastrar|criar)/i }).last().click();
  let r = await esperar((x) => x.metodo === "POST" && x.rota.startsWith("/clientes"), desde);
  conferir("criar cliente responde 201, e não 422", r?.status === 201, `-> ${r?.status}`);

  // ── cria um PROCESSO pela tela ────────────────────────────────────────
  await pagina.goto(`${APP}/processos`);
  await pagina.getByRole("button", { name: /novo processo/i }).click();
  /* ⚠️ `#numero`, e não o primeiro textbox: o primeiro é o campo de BUSCA da
     listagem, que fica atrás do modal. E o número precisa de dígito
     verificador válido -- o service o confere antes de gravar. */
  /* ⚠️ Um número por rodada. Repetir o mesmo devolve 409 "já cadastrado" --
     resposta certa, mas o roteiro leria como falha e esconderia um 422 de
     verdade atrás dela. */
  const numeros = env.NUMEROS.split(",");
  await pagina.locator("#numero").fill(numeros[Math.floor(Date.now() / 1000) % numeros.length]);
  // "Subgrupo" é o outro campo obrigatório do formulário.
  await pagina.locator("#subgrupo").click();
  await pagina.getByRole("option").first().click();
  desde = respostas.length;
  await pagina.getByRole("button", { name: /^(salvar|cadastrar|criar)/i }).last().click();
  r = await esperar((x) => x.metodo === "POST" && x.rota.includes("/processos"), desde);
  conferir("criar processo responde 201, e não 422", r?.status === 201, `-> ${r?.status}`);

  // ── percorre as telas que sobraram ────────────────────────────────────
  for (const rota of ["/kanban", "/agenda", "/atendimentos", "/documentos",
                      "/grupo", "/perfil", "/financeiro"]) {
    await pagina.goto(`${APP}${rota}`);
    await pagina.waitForLoadState("networkidle");
  }

  // ── o veredito: nenhum 422 na sessão inteira ──────────────────────────
  const ruins = respostas.filter((x) => x.status === 422);
  conferir("NENHUM 422 na sessão inteira", ruins.length === 0,
           ruins.map((x) => `${x.metodo} ${x.rota}`).join(" | ").slice(0, 120));
  const cincos = respostas.filter((x) => x.status >= 500);
  conferir("e nenhum 5xx", cincos.length === 0,
           cincos.map((x) => `${x.metodo} ${x.rota}`).join(" | ").slice(0, 120));
  console.log(`\n  (${respostas.length} respostas da API observadas)`);
} finally {
  await navegador.close();
}

console.log(`\n${falhas.length} falha(s).`);
process.exit(falhas.length ? 1 : 0);
