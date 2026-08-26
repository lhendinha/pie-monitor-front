/** Cada número do "Resumo rápido" abre a lista que ele contou -- em Chrome.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_resumo.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-links-da-home.mjs
 *
 * 🔴 A régua é o cabeçalho de `ResumoRapido`: *"o número e o destino contam
 * a MESMA história -- o clique aplica exatamente o filtro da contagem"*.
 *
 * Medido em 26/08/2026, antes: três números sem link nenhum, e dois com link
 * que abria a lista errada -- "Envios com falha" dizia 2 e abria 6;
 * "Movimentações (7 dias)" dizia 3 e abria 4.
 *
 * ⚠️ Depende do cenário de `semear_resumo.py`, que põe em cada contagem
 * itens que entram E itens parecidos que não entram. Sem os que não entram,
 * um filtro quebrado que devolve tudo passaria por acaso.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 30 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(e.message.slice(0, 120)));
pagina.on("response", (r) => {
  if (r.status() >= 400) erros.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();
console.log("entrou\n");

/** Lê o número do card, clica, e devolve o que a tela de destino mostra. */
async function abrir(rotulo, destino) {
  await pagina.goto(APP);
  await pagina.getByText("Resumo rápido").waitFor();
  const linha = pagina.getByRole("button", { name: new RegExp(rotulo) });
  const numero = Number((await linha.textContent()).match(/(\d+)$/)[1]);
  await linha.click();
  await pagina.getByRole("heading", { name: destino }).waitFor();
  await pagina.waitForLoadState("networkidle");
  return numero;
}

/** "Mostrando N de M" -- é o que Histórico, Processos e Atendimentos usam. */
async function mostrando() {
  const t = await pagina.getByText(/Mostrando \d+ de \d+/).first().textContent();
  return Number(t.match(/Mostrando (\d+)/)[1]);
}

const resultados = [];
const conferir = (rotulo, card, tela) => {
  const ok = card === tela;
  resultados.push(ok);
  console.log(`  ${ok ? "ok " : "✗  "} ${rotulo.padEnd(28)} card=${card}  tela=${tela}`);
};

conferir("A verificar até hoje", await abrir("A verificar até hoje", "Processos"), await mostrando());
conferir("Prazo final em até 7 dias", await abrir("Prazo final em até 7 dias", "Processos"), await mostrando());
conferir("Processos monitorados", await abrir("Processos monitorados", "Processos"), await mostrando());
conferir("Envios com falha", await abrir("Envios com falha", "Histórico"), await mostrando());
conferir("Movimentações", await abrir("Movimentações", "Histórico"), await mostrando());
conferir("Atendimentos em andamento", await abrir("Atendimentos em andamento", "Atendimentos"), await mostrando());

/* A Agenda não tem rodapé de contagem: a asserção é QUAIS tarefas aparecem.
   Prova mais que um número -- a atrasada CONCLUÍDA tem que ficar de fora. */
const atrasadas = await abrir("Tarefas atrasadas", "Agenda");
const temAberta = await pagina.getByText("Atrasada aberta").count();
const temPronta = await pagina.getByText("Atrasada e pronta").count();
const rotulo = await pagina.getByText(/^Atrasadas — até /).count();
const setas = await pagina.getByRole("button", { name: "Período anterior" }).count();
const botaoHoje = await pagina.getByRole("button", { name: "Hoje" }).count();
const visaoTravada = await pagina.getByText(/Por mês|Por semana|Por dia|Em lista/).first().isDisabled();

console.log(`\n  Agenda, modo atrasadas (card dizia ${atrasadas}):`);
console.log(`    ${temAberta === 1 ? "ok " : "✗  "} a atrasada ABERTA aparece`);
console.log(`    ${temPronta === 0 ? "ok " : "✗  "} a atrasada CONCLUÍDA fica de fora`);
console.log(`    ${rotulo === 1 ? "ok " : "✗  "} o rótulo diz "Atrasadas — até ..."`);
console.log(`    ${setas === 0 ? "ok " : "✗  "} sem setas de navegação`);
console.log(`    ${botaoHoje === 0 ? "ok " : "✗  "} sem botão "Hoje"`);
console.log(`    ${visaoTravada ? "ok " : "✗  "} seletor de visão desabilitado`);

/* 🔴 Achado da auditoria: a pílula desabilitada dizia "Por mês" sobre uma
   lista corrida, porque `visao` continuava "mes". Rótulo dizendo uma coisa e
   conteúdo sendo outra é o defeito que esta tela existe pra não ter. */
const rotuloDaVisao = await pagina
  .getByText(/Por mês|Por semana|Por dia|Em lista/)
  .first()
  .textContent();
const visaoCoerente = rotuloDaVisao.trim() === "Em lista";
console.log(`    ${visaoCoerente ? "ok " : "✗  "} a pílula diz "Em lista", e não o mês (diz: "${rotuloDaVisao.trim()}")`);
resultados.push(visaoCoerente);
resultados.push(
  temAberta === 1 && temPronta === 0 && rotulo === 1 && setas === 0 && botaoHoje === 0 && visaoTravada,
);

/* ⚠️ O caminho de volta do estado VAZIO ("Ver todos os envios") não é
   conferido aqui, de propósito: montar um vazio com dado real exigiria uma
   combinação de filtros que o cenário semeado não produz, e forçá-la seria
   um teste sobre a semeadura, não sobre a tela. Ele é coberto em
   `HistoricoPage/index.test.tsx`, com os três filtros LIGADOS na montagem --
   sem isso o assert passava mesmo com o botão limpando só o tipo. */

/* "Sem responsável" não navega: a lista já está na home. */
await pagina.goto(APP);
await pagina.getByText("Resumo rápido").waitFor();
await pagina.getByRole("button", { name: /Tarefas sem responsável/ }).click();
await pagina.waitForTimeout(300);
const ficou = new URL(pagina.url()).pathname === "/";
console.log(`\n  ${ficou ? "ok " : "✗  "} "Tarefas sem responsável" destaca o card sem sair da home`);
resultados.push(ficou);

if (erros.length) console.log(`\n  erros: ${erros.join(" | ")}`);
await navegador.close();
process.exit(resultados.every(Boolean) && !erros.length ? 0 : 1);
