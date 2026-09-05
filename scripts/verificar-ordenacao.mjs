/** A ordem alfabética das quatro listagens -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) cd ../api && .venv/bin/python scripts/offline/semear_ordenacao.py
 *   3) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   4) node scripts/verificar-ordenacao.mjs
 *
 * 🔴 **O que só o Chrome responde**: a ordem que a PESSOA vê. A suíte prova o
 * que a rota devolve; entre a rota e a tela há cache do React Query,
 * `select`, e componentes que reordenam por conta própria -- o Kanban faz
 * exatamente isso com as colunas. Um `sort` esquecido no front desfaria a
 * ordenação do servidor sem derrubar teste nenhum da API.
 *
 * 🔴 **E o par negativo junto**: o Histórico tem de continuar cronológico, e
 * Fases/Situações na ordem arrastada. Verificar só o que mudou deixaria
 * passar quem "uniformizou" o que não devia.
 *
 * ⚠️ O cenário é criado de Z para A: com a ordenação antiga
 * (mais-novo-primeiro) a tela devolveria o resultado esperado por
 * coincidência, e a verificação passaria sem a mudança.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
/** Os três de cada conjunto, na ordem em que a tela deve mostrá-los.
 *
 * ⚠️ Nomes COMPLETOS, e não só o primeiro: o primeiro nome sozinho exigiria
 * `\b` para não casar dentro de outra palavra -- e `\b` do JavaScript usa
 * `\w = [A-Za-z0-9_]`, então `\bÂ` **nunca casa**. "Ângela" desaparecia da
 * leitura por causa do acento, e a falha parecia defeito de ordenação. */
const ESPERADO = ["Ana Beatriz", "Ângela Nunes", "Zuleica Ramos"];

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome, detalhe });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1500, height: 1000 } })
).newPage();
const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("/login")) {
    problemas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  }
});

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor({ timeout: 30_000 });
console.log("entrou\n");

/** Os três nomes semeados, na ordem em que aparecem NA TELA.
 *
 * ⚠️ Lê o TEXTO da página inteira, e não células de tabela: Atendimentos não
 * usa `<table>` -- as linhas dele são `Flex`. Um seletor por `td` funcionava
 * em três telas e dava timeout na quarta, e o timeout parecia defeito de
 * ordenação. */
async function nomesNaTela() {
  return pagina.evaluate(() => {
    const texto = document.body.innerText;
    const alvos = ["Ana Beatriz", "Ângela Nunes", "Zuleica Ramos"];
    // A POSIÇÃO da primeira aparição de cada um dá a ordem da lista -- a tela
    // repete o nome (apelido, sub-linha, etiqueta) e só a primeira interessa.
    return alvos
      .map((n) => ({ nome: n, onde: texto.indexOf(n) }))
      .filter((x) => x.onde >= 0)
      .sort((a, b) => a.onde - b.onde)
      .map((x) => x.nome);
  });
}

/** Abre a tela, espera a TABELA, e confere a ordem dos três semeados.
 *
 * ⚠️ Espera as LINHAS, não um texto. A primeira versão esperava
 * `getByText("Ana")` -- que casa em qualquer canto da página, inclusive fora
 * da tabela -- e liberava antes de a lista renderizar. As quatro checagens
 * falharam por isso, não pela ordenação, que estava certa. */
async function conferirTela(rota, rotulo) {
  /* ⚠️ Página de 50, e não a padrão de 10: as listas vêm em ordem
     alfabética e "Zuleica" é a ÚLTIMA de propósito. Com as outras sementes
     do volume (16 processos em 05/09/2026), ela cai na segunda página e o
     roteiro dava timeout esperando um nome que estava certo -- só que
     noutra página. `tamanho` é o parâmetro de `usePaginacaoDaLista`. */
  await pagina.goto(`${APP}${rota}?tamanho=50`);
  // Espera os TRÊS aparecerem -- é o que garante que a lista terminou de
  // renderizar, sem depender de a tela usar tabela ou linhas soltas.
  for (const nome of ESPERADO) {
    await pagina.getByText(nome, { exact: false }).first().waitFor({ timeout: 20_000 });
  }
  const nomes = await nomesNaTela();
  conferir(
    JSON.stringify(nomes) === JSON.stringify(ESPERADO),
    `${rotulo} em ordem alfabética`,
    nomes.join(" < ") || "não achou os três semeados",
  );
}

await conferirTela("/processos", "Processos");
await conferirTela("/clientes", "Clientes");
await conferirTela("/documentos", "Documentos");
await conferirTela("/atendimentos", "Atendimentos");

// ── 🔴 os pares NEGATIVOS: o que NÃO podia mudar ─────────────────────────
/* Verificar só o que mudou deixaria passar quem "uniformizou" o que não
   devia. Os dois cenários abaixo são semeados AO CONTRÁRIO do alfabeto: se
   alguém alfabetar, a lista inverte e estas checagens acusam. */

/** A posição da primeira aparição de cada texto, na ordem da tela. */
async function ordemNaTela(alvos) {
  return pagina.evaluate((lista) => {
    const texto = document.body.innerText;
    return lista
      .map((n) => ({ nome: n, onde: texto.indexOf(n) }))
      .filter((x) => x.onde >= 0)
      .sort((a, b) => a.onde - b.onde)
      .map((x) => x.nome);
  }, alvos);
}

const CONTRA_ALFABETO = ["Zebra", "Meio", "Alfa"];

/* ⚠️ Pelo NÚMERO mascarado, e não pelo assunto: `ItemDeHistorico` só mostra
   o assunto em lembrete de tarefa -- nas notificações de processo ele mostra
   `mascararNumeroProcesso(numero_processo)`. Semear os três com o mesmo
   número deixava três linhas idênticas e nada a conferir. */
await pagina.goto(`${APP}/historico`);
await pagina.getByText("7300000-").first().waitFor({ timeout: 20_000 });
const hist = await ordemNaTela(["7300000-", "7200000-", "7100000-"]);
conferir(
  JSON.stringify(hist) === JSON.stringify(["7300000-", "7200000-", "7100000-"]),
  "🔴 o Histórico continua CRONOLÓGICO -- o mais novo no topo",
  hist.map((h) => h.slice(0, 2)).join(" < ") || "não achou os três",
);

await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Fases" }).click();
await pagina.getByText("Zebra (1a)").first().waitFor({ timeout: 20_000 });
const fases = await ordemNaTela(["Zebra (1a)", "Meio (2a)", "Alfa (3a)"]);
conferir(
  JSON.stringify(fases.map((f) => f.split(" ")[0])) === JSON.stringify(CONTRA_ALFABETO),
  "🔴 Fases continua na ordem ARRASTADA, não alfabética",
  fases.map((f) => f.split(" ")[0]).join(" < "),
);

// A UF, que é lista fechada e mudou de ordem.
await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
await pagina.getByRole("button", { name: "Adicionar inscrição" }).click();
await pagina.getByLabel(/^UF/).click();
const ufs = await pagina.evaluate(() =>
  [...document.querySelectorAll('[role="option"]')].map((o) => (o.textContent || "").trim()),
);
const emOrdem = JSON.stringify(ufs) === JSON.stringify([...ufs].sort());
conferir(ufs.length === 27, "o seletor de UF tem as 27", `${ufs.length}`);
conferir(emOrdem, "🔴 e elas estão em ordem alfabética NA TELA", ufs.slice(0, 6).join(", "));

await pagina.screenshot({ path: "/tmp/ord-uf.png" });
await navegador.close();

console.log("\n" + "─".repeat(60));
for (const p of problemas) console.log(`⚠️  ${p}`);
const falhas = checagens.filter((c) => !c.ok);
console.log(`${checagens.length - falhas.length}/${checagens.length} checagens ok`);
if (falhas.length) console.log("FALHAS: " + falhas.map((f) => f.nome).join(" | "));
process.exit(falhas.length || problemas.length ? 1 : 0);
