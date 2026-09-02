/** A tela não afirma a OAB que ela não tem -- em Chrome DE VERDADE.
 *
 *   yarn dev --port 5174
 *   node scripts/verificar-oab-sem-dado.mjs
 *   node scripts/verificar-oab-sem-dado.mjs --headless   (só pra CI)
 *
 * O defeito que este roteiro guarda (medido em 02/09/2026): o modal de
 * editar membro desenhava os campos de OAB VAZIOS enquanto `lerMembro`
 * corria, e continuava vazio se ela falhasse. Vazio nas DUAS partes é o
 * gesto de APAGAR a inscrição -- então quem abrisse o modal só para
 * corrigir um NOME e salvasse antes da resposta apagava a OAB de quem tem,
 * junto com a importação automática.
 *
 * ⚠️ Por que em navegador, se já há teste em jsdom: o jsdom não executa o
 * envio implícito (Enter num campo) quando o botão de submit está FORA do
 * `<form>` -- e aqui ele está, ligado por `form={idFormulario}`. Medido: com
 * o Salvar habilitado, o Enter não submetia nada em jsdom, então um teste de
 * teclado lá passa verde com a trava ou sem ela. O terceiro cenário abaixo é
 * o único lugar onde esse caminho existe de verdade.
 *
 * A API é stubada (`stubsDaApi.mjs`), com a rota da inscrição sequestrada
 * caso a caso -- sem token, sem backend no ar e sem gastar tentativa de
 * login.
 *
 * ⚠️ O cenário 2 demora ~7s, e isso é correto: `queryClient` repete erro
 * transitório 3 vezes (medido: 4 idas à rede, erro visível em 7,4s). Até lá
 * a tela mostra o ESQUELETO, não o erro -- ainda não se sabe. Quem esperar
 * pelo estado de erro com timeout curto vai concluir que ele não existe.
 */
import { chromium } from "playwright";

import { fingirSessao, instalarStubs } from "./stubsDaApi.mjs";

const APP = "http://localhost:5174";
const EMAIL = "marina@argos.local";
const headless = process.argv.includes("--headless");

const INSCRICAO = {
  email: EMAIL, apelido: "Marina Duarte", papel: "user", grupo_id: "grupo-demo",
  numero_oab: "206876", uf_oab: "MG",
  importacao_automatica: false, subgrupos_destino: [], subgrupos: ["sg-civel"],
};

const navegador = await chromium.launch({ channel: "chrome", headless, slowMo: headless ? 0 : 40 });
const falhas = [];
const conferir = (ok, texto) => {
  console.log(`  ${ok ? "ok  " : "FALHA"}  ${texto}`);
  if (!ok) falhas.push(texto);
};

/** Abre o modal de editar da Marina com a rota da inscrição sob controle.
 *
 * ⚠️ Contexto NOVO a cada cenário, e não é zelo: o React Query guarda a
 * resposta, então reabrir o modal no mesmo contexto serviria o dado do
 * cache e o cenário de erro nunca apareceria. */
async function abrirModal(comportamento) {
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  await fingirSessao(contexto);
  await instalarStubs(contexto);
  /* Depois dos stubs de propósito: no Playwright a rota registrada por
     último atende primeiro, e a genérica `/grupos/membros/` responderia a
     leitura da inscrição com a LISTA. */
  await contexto.route(`**/grupos/membros/${encodeURIComponent(EMAIL)}`, comportamento);

  const pagina = await contexto.newPage();
  /* A lista de membros é uma SUB-ABA de `/grupo`, em estado local -- não tem
     endereço próprio para abrir direto. */
  await pagina.goto(`${APP}/grupo`, { waitUntil: "networkidle" });
  await pagina.getByRole("tab", { name: "Membros" }).click();
  await pagina.getByRole("button", { name: "Editar Marina Duarte" }).click();
  await pagina.getByRole("dialog").waitFor();
  return { pagina, contexto };
}

const campoDaOab = (p) => p.getByLabel(/Número da OAB/);
const salvar = (p) => p.getByRole("button", { name: "Salvar" });

// ── 1. carregando: não há campo para a resposta sobrescrever ──────────────
{
  console.log("\n1. enquanto a inscrição carrega");
  let liberar;
  const espera = new Promise((r) => { liberar = r; });
  const { pagina, contexto } = await abrirModal(async (rota) => {
    await espera;
    await rota.fulfill({ json: INSCRICAO });
  });

  conferir(await campoDaOab(pagina).count() === 0, "o campo de OAB não existe na tela");
  conferir(await pagina.getByText("Carregando…").count() > 0, "o esqueleto anuncia «Carregando…»");
  conferir(await salvar(pagina).isDisabled(), "o Salvar está travado");

  // E quando a resposta chega, os campos aparecem com o valor gravado.
  liberar();
  await campoDaOab(pagina).waitFor();
  conferir(await campoDaOab(pagina).inputValue() === "206876", "chegando a resposta, o campo traz «206876»");
  conferir(await salvar(pagina).isEnabled(), "e o Salvar destrava");
  await contexto.close();
}

// ── 2. erro: a tela diz que não sabe, e não deixa salvar por cima ─────────
{
  console.log("\n2. quando a leitura da inscrição FALHA");
  const { pagina, contexto } = await abrirModal((rota) => rota.abort("failed"));

  /* ⚠️ Escopado ao diálogo: `useToastOnQueryError` mostra a MESMA frase no
     toast, e sem o escopo o seletor casa duas vezes. O aviso em dobro é de
     propósito -- o toast some em segundos, o do modal fica. */
  await pagina.getByRole("dialog").getByText(/Não foi possível carregar a inscrição/).waitFor();
  conferir(await campoDaOab(pagina).count() === 0, "o campo de OAB não existe na tela");
  conferir(await pagina.getByRole("button", { name: "Tentar de novo" }).count() > 0,
    "oferece «Tentar de novo» em vez de virar beco");
  conferir(await salvar(pagina).isDisabled(), "o Salvar está travado");

  // O resto do formulário continua utilizável -- os dados dele vêm da prop.
  const nome = pagina.getByLabel(/Nome completo/);
  await nome.fill("Marina Duarte Silva");
  conferir(await nome.inputValue() === "Marina Duarte Silva", "o Nome completo continua editável");
  conferir(await salvar(pagina).isDisabled(), "e mesmo editado, o Salvar segue travado");
  await contexto.close();
}

// ── 3. 🔴 o Enter, que é o caminho que o jsdom não tem ────────────────────
{
  console.log("\n3. o Enter num campo de texto, com a leitura falhando");
  const { pagina, contexto } = await abrirModal((rota) => rota.abort("failed"));
  await pagina.getByRole("dialog").getByText(/Não foi possível carregar a inscrição/).waitFor();

  let patch = null;
  await contexto.route("**/grupos/membros/**", (rota) => {
    if (rota.request().method() === "PATCH") patch = rota.request().postData();
    return rota.fulfill({ json: {} });
  });

  await pagina.getByLabel(/Nome completo/).fill("Marina Duarte Silva");
  await pagina.getByLabel(/Nome completo/).press("Enter");
  await pagina.waitForTimeout(600);

  conferir(patch === null, `o Enter não disparou PATCH nenhum${patch ? ` -- saiu ${patch}` : ""}`);
  conferir(await pagina.getByRole("dialog").count() > 0, "e o modal continua aberto");
  await contexto.close();
}

await navegador.close();
console.log(`\n${falhas.length ? `${falhas.length} FALHA(S)` : "tudo certo"}\n`);
process.exit(falhas.length ? 1 : 0);
