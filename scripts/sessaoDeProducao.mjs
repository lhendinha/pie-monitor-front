/** Abrir produção em Chrome SEM gastar tentativa de login.
 *
 * 🔴 **A conta de teste bloqueia em 5 tentativas.** Cada roteiro que loga do
 * zero queima uma; três já foram queimadas numa sessão por um payload montado
 * à mão. Este módulo existe para que a senha seja digitada UMA vez e as
 * rodadas seguintes custem ZERO tentativas.
 *
 * Como: depois de um login que deu certo, o `storageState` do contexto é
 * gravado em `.sessao-de-producao.json` (gitignorado). Na próxima rodada o
 * contexto nasce com ele, a tela já abre logada, e o login nem acontece.
 *
 * ⚠️ **Nada é impresso** -- nem o e-mail. As credenciais vêm de `.env.local`
 * (`PJE_TEST_EMAIL` / `PJE_TEST_SENHA`), que é gitignorado.
 *
 * ⚠️ **O login é feito PELA TELA**, e nunca por requisição montada à mão:
 * quem monta o corpo é o próprio front, que já sabe que o campo é `password`
 * e não `senha`. Foi um corpo à mão que queimou as três tentativas.
 */
import { chromium } from "playwright";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const APP = "https://argos-monitor.vercel.app";

const SESSAO = fileURLToPath(new URL("../.sessao-de-producao.json", import.meta.url));

function credenciais() {
  let bruto;
  try {
    bruto = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("Faltou o .env.local com PJE_TEST_EMAIL e PJE_TEST_SENHA (ver o README).");
    process.exit(1);
  }
  const pega = (chave) => bruto.match(new RegExp(`^${chave}=(.*)$`, "m"))?.[1]?.trim();
  const email = pega("PJE_TEST_EMAIL");
  const senha = pega("PJE_TEST_SENHA");
  if (!email || !senha) {
    console.error("O .env.local existe mas não traz PJE_TEST_EMAIL e PJE_TEST_SENHA.");
    process.exit(1);
  }
  return { email, senha };
}

const jaEntrou = (pagina) =>
  pagina.getByText("Resumo rápido").waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);

/** Devolve `{ navegador, contexto, pagina }` já dentro do sistema.
 *
 * `aoCriarPagina` roda com a página recém-criada, ANTES da primeira
 * navegação: é onde vão os ouvintes de `pageerror`/`console`/`response`, que
 * de outro modo perderiam o que acontece durante o login.
 */
export async function abrirProducaoLogado({
  viewport = { width: 1500, height: 1000 },
  aoCriarPagina,
} = {}) {
  const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });

  // ── 1. a sessão guardada, quando existe: custo ZERO de tentativa ──────
  if (existsSync(SESSAO)) {
    const contexto = await navegador.newContext({ viewport, storageState: SESSAO });
    const pagina = await contexto.newPage();
    aoCriarPagina?.(pagina);
    await pagina.goto(APP);
    if (await jaEntrou(pagina)) {
      console.log("Sessão guardada reaproveitada -- nenhuma tentativa de login gasta.");
      return { navegador, contexto, pagina };
    }
    /* Expirou. Apaga antes de tentar a senha, senão a próxima rodada tenta
       de novo com o mesmo estado morto e gasta outra tentativa. */
    console.log("A sessão guardada expirou. Vou logar UMA vez.");
    unlinkSync(SESSAO);
    await contexto.close();
  }

  // ── 2. login, UMA tentativa, sem laço ─────────────────────────────────
  const contexto = await navegador.newContext({ viewport });
  const pagina = await contexto.newPage();
  aoCriarPagina?.(pagina);
  const { email, senha } = credenciais();

  await pagina.goto(APP);
  await pagina.getByLabel(/e-?mail/i).fill(email);
  await pagina.getByRole("textbox", { name: "Senha" }).fill(senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();

  if (!(await jaEntrou(pagina))) {
    /* 🔴 PARA aqui. Sem retry, sem laço: são 5 tentativas até o bloqueio. */
    console.error(
      "\nO login não passou. O roteiro PARA aqui de propósito -- a conta " +
        "bloqueia em 5 tentativas.\nConfira PJE_TEST_EMAIL/PJE_TEST_SENHA no " +
        ".env.local ANTES de rodar de novo.",
    );
    await navegador.close();
    process.exit(1);
  }

  await contexto.storageState({ path: SESSAO });
  console.log("Login feito (1 tentativa) e sessão guardada para as próximas rodadas.");
  return { navegador, contexto, pagina };
}
