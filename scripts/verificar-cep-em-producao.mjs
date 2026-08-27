/** Confere `GET /cep/{cep}` na API de PRODUÇÃO, antes de o front subir.
 *
 *   node scripts/verificar-cep-em-producao.mjs
 *
 * 🔴 A API sobe antes do front, e é conferida ANTES dele -- senão a tela
 * nova chama uma rota que não existe e mostra erro pra quem estiver usando.
 *
 * 🔴 UMA tentativa de login, sem retry: a conta bloqueia em **5**. E o login
 * é pela TELA, não por `fetch` montado à mão -- quem monta o corpo é o
 * próprio front, que já sabe que o campo é `password` e não `senha`. Uma
 * sessão chegou a queimar três tentativas por montar o payload sozinha.
 *
 * ⚠️ A chamada à rota vai de DENTRO da página autenticada, reusando o token
 * da sessão: não gasta login e ainda prova que o CSP de produção permite o
 * caminho (a Lambda URL está no `connect-src`; provedor de CEP, não).
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const APP = "https://argos-monitor.vercel.app";

/** Lê `.env.local` sem despejar o conteúdo em lugar nenhum. */
function credenciais() {
  let bruto;
  try {
    bruto = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error("Faltou o .env.local com PJE_TEST_EMAIL e PJE_TEST_SENHA (gitignorado).");
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

const CONTA = credenciais();
const navegador = await chromium.launch({ channel: "chrome", headless: false });
const pagina = await (await navegador.newContext({ viewport: { width: 1400, height: 900 } })).newPage();

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();

const entrou = await pagina
  .getByText("Resumo rápido")
  .waitFor({ timeout: 25_000 })
  .then(() => true)
  .catch(() => false);

if (!entrou) {
  /* 🔴 PARA aqui. Sem retry, sem laço: são 5 tentativas até o bloqueio. */
  console.error(
    "\nO login não passou. O script PARA aqui de propósito -- a conta bloqueia " +
      "em 5 tentativas.\nConfira PJE_TEST_EMAIL/PJE_TEST_SENHA no .env.local.",
  );
  await navegador.close();
  process.exit(1);
}
console.log("entrou\n");

// A base da API não é adivinhada: sai da própria requisição que a página faz.
const urlDaApi = await pagina.evaluate(
  () =>
    performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => n.includes("lambda-url"))
      ?.split("/")
      .slice(0, 3)
      .join("/") ?? null,
);
conferir(Boolean(urlDaApi), "achou a base da API pelas requisições da própria página", urlDaApi ?? "");

const chaveDoToken = await pagina.evaluate(
  () => Object.keys(localStorage).find((k) => k.toLowerCase().includes("access")) ?? null,
);

async function chamar(cep) {
  return pagina.evaluate(
    async ([base, chave, c]) => {
      const r = await fetch(`${base}/cep/${c}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(chave)}` },
      });
      return { status: r.status, corpo: await r.text() };
    },
    [urlDaApi, chaveDoToken, cep],
  );
}

console.log("— a rota em produção —");
const valido = await chamar("30130010");
conferir(valido.status === 200, "CEP válido responde 200", `HTTP ${valido.status}`);
let dados = {};
try {
  dados = JSON.parse(valido.corpo);
} catch {
  /* deixa vazio: as checagens abaixo acusam */
}
conferir(dados.logradouro === "Praça Sete de Setembro", "logradouro certo", dados.logradouro ?? valido.corpo.slice(0, 80));
conferir(dados.cidade === "Belo Horizonte", "cidade traduzida de `localidade`", dados.cidade ?? "");
conferir(dados.uf === "MG", "uf", dados.uf ?? "");
conferir(dados.cep === "30130010", "🔴 cep SEM máscara -- é como a entidade guarda", dados.cep ?? "");
conferir(!("complemento" in dados), "🔴 sem `complemento` -- lá é faixa de numeração, não endereço");

const inexistente = await chamar("12345678");
conferir(inexistente.status === 404, "CEP inexistente dá 404 -- 'preencha à mão'", `HTTP ${inexistente.status}`);

const malformado = await chamar("123");
conferir(malformado.status === 400, "CEP malformado dá 400", `HTTP ${malformado.status}`);

const falhas = checagens.filter((c) => !c.ok);
console.log(
  `\n${falhas.length ? `❌ ${falhas.length} de ${checagens.length} falharam` : `✅ ${checagens.length} checagens, todas passaram`}`,
);
await navegador.close();
process.exit(falhas.length ? 1 : 0);
