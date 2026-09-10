/** As ações reversíveis do lote, em Chrome de verdade, com o quadro cheio.
 *
 *   1) cd ../api && yarn offline   (esperar "Server ready")
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-acoes-em-lote.mjs
 *
 * 🔴 O que só o navegador mostra: se a barra com CINCO botões ainda cabe no
 * card de 634px da Área de trabalho (o plano mediu 615px antes da `nota` do
 * Kanban existir), se o aviso com Desfazer desfaz DE VERDADE no servidor, e se
 * o motivo da trava aparece à vista quando a seleção cruza subgrupos.
 *
 * ⚠️ Escreve no offline -- conclui, muda status e atribui --, e desfaz cada
 * uma logo depois. Rodar contra produção seria mexer em trabalho real.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 8.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const FOTOS = "/tmp/lote8";
const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e)));
const veredito = [];
const ok = (nome, cond, det = "") => { veredito.push([nome, Boolean(cond), det]); };

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill("chefe@local.test");
await pagina.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");

/** O quadro como a tela o mostra: cada coluna e os títulos dos cartões. */
const mapa = () => pagina.evaluate(() =>
  [...document.querySelectorAll("div")].filter((d) => d.className && getComputedStyle(d).flexBasis === "300px")
    .map((c) => ({
      nome: c.querySelector("p")?.textContent?.trim() ?? "?",
      cartoes: [...c.querySelectorAll('[role="button"], label[data-part="root"]')]
        .map((n) => n.querySelector("p")?.textContent?.trim()).filter(Boolean),
    })));
const colunaDe = async (titulo) => (await mapa()).find((c) => c.cartoes.includes(titulo))?.nome;
const esperarAviso = async (re) => { await pagina.getByText(re).first().waitFor({ timeout: 8000 }); await pagina.waitForTimeout(250); };
/** A largura da barra e se ela transborda o próprio contêiner. */
const medirBarra = () => pagina.evaluate(() => {
  const conta = [...document.querySelectorAll("p")].find((p) => /de \d+ selecionadas?/.test(p.textContent ?? ""));
  const barra = conta?.parentElement;
  if (!barra) return null;
  const r = barra.getBoundingClientRect();
  return { largura: Math.round(r.width), altura: Math.round(r.height), transborda: barra.scrollWidth > barra.clientWidth + 1 };
});

// ---------------------------------------------------------------- Kanban
await pagina.goto(`${APP}/kanban`);
await pagina.getByRole("heading", { name: "Gestão kanban" }).waitFor();
await pagina.waitForLoadState("networkidle");
await pagina.getByText("A Filtro", { exact: true }).first().click();
await pagina.getByPlaceholder("Buscar subgrupo").fill("Cível");
await pagina.waitForTimeout(700);
await pagina.getByRole("option", { name: "Cível", exact: true }).first().click();
await pagina.waitForLoadState("networkidle");
await pagina.waitForTimeout(800);

console.log("passo: kanban carregado");
const inicio = await mapa();
const [t1, t2] = inicio[0].cartoes;
await pagina.getByRole("button", { name: "Selecionar", exact: true }).click();
await pagina.waitForTimeout(300);
const marcar = async (titulo) => { await pagina.getByText(titulo, { exact: true }).first().click(); await pagina.waitForTimeout(150); };
console.log(`passo: marcando t1=${t1} | t2=${t2}`);
await marcar(t1); await marcar(t2);

const ordem = await pagina.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent?.trim())
  .filter((t) => ["Cancelar", "Atribuir a…", "Alterar status…", "Concluir", "Excluir 2"].includes(t)));
ok("barra: ordem Cancelar · Atribuir · Status · Concluir · Excluir", JSON.stringify(ordem) === JSON.stringify(["Cancelar", "Atribuir a…", "Alterar status…", "Concluir", "Excluir 2"]), JSON.stringify(ordem));
const barraKanban = await medirBarra();
ok("Kanban: a barra (com a nota) não transborda", barraKanban && !barraKanban.transborda, JSON.stringify(barraKanban));
await pagina.screenshot({ path: `${FOTOS}-1-kanban-barra.png` });

console.log("passo: barra conferida");
// Concluir, com o modal reversível
await pagina.getByRole("button", { name: "Concluir", exact: true }).click();
const dialogo = pagina.getByRole("dialog");
await dialogo.waitFor();
const botaoConfirmar = dialogo.getByRole("button", { name: "Concluir 2" });
ok("modal: botão 'Concluir 2' primário", (await botaoConfirmar.getAttribute("data-variante")) === "primario", await botaoConfirmar.getAttribute("data-variante"));
ok("modal: sem 'não pode ser desfeita'", (await dialogo.getByText("Essa ação não pode ser desfeita.").count()) === 0);
ok("modal: diz como reabrir", (await dialogo.getByText(/Dá para reabrir depois/).count()) === 1);
await pagina.screenshot({ path: `${FOTOS}-2-modal-concluir.png` });
console.log("passo: modal conferido");
await botaoConfirmar.click();
await esperarAviso(/tarefas? concluídas?\./);
ok("concluir: aviso com DESFAZER", (await pagina.getByRole("button", { name: "Desfazer" }).count()) === 1);
/** O controle está no topo do ponto central dele? Um elemento fixo por cima
 *  (o X coberto no canto da tela) deixa o botão visível ao DOM e inalcançável
 *  ao dedo -- e só o navegador mostra isso. */
const coberto = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return topo && !(topo === el || el.contains(topo)) ? (topo.outerHTML || "").slice(0, 120) : "";
});
const xCoberto = await coberto(pagina.getByRole("button", { name: "Dispensar aviso" }).first());
const desfazerCoberto = await coberto(pagina.getByRole("button", { name: "Desfazer" }).first());
/* ⚠️ NOTA, e não veredito. Em desenvolvimento o botão do `ReactQueryDevtools`
   fica no mesmo canto e cobre o X -- medido: o que está por cima é o `<circle>`
   do logo dele. Não é da tela: `main.tsx` só o monta com `EM_DESENVOLVIMENTO`.
   O veredito é a medição de baixo, com ele escondido. */
console.log(`nota (só em desenvolvimento): X coberto por ${xCoberto || "nada"} | DESFAZER coberto por ${desfazerCoberto || "nada"}`);
/* O que cobre o canto, em desenvolvimento, é o botão do `ReactQueryDevtools`,
   que `main.tsx` só monta com `EM_DESENVOLVIMENTO`. Esconde-se ele e mede-se de
   novo: é a tela que produção vai ter. A medição de cima fica, para dizer QUEM
   cobria. */
await pagina.evaluate(() => {
  for (const el of document.querySelectorAll('[aria-label*="devtools" i], .tsqd-open-btn-container')) {
    el.style.display = "none";
  }
});
const xSemDevtools = await coberto(pagina.getByRole("button", { name: "Dispensar aviso" }).first());
ok("aviso, sem o devtools de desenvolvimento: o X não está coberto", !xSemDevtools, xSemDevtools);
const desfazerSemDevtools = await coberto(pagina.getByRole("button", { name: "Desfazer" }).first());
ok("aviso, sem o devtools de desenvolvimento: o DESFAZER não está coberto", !desfazerSemDevtools, desfazerSemDevtools);
ok("concluir: FICA no modo de seleção", (await pagina.getByText(/de \d+ selecionadas?/).count()) >= 1);
await pagina.waitForLoadState("networkidle"); await pagina.waitForTimeout(500);
ok("concluir: as duas foram para a conclusão", (await colunaDe(t1)) === "Concluído" && (await colunaDe(t2)) === "Concluído", `${await colunaDe(t1)} / ${await colunaDe(t2)}`);
await pagina.screenshot({ path: `${FOTOS}-3-aviso-desfazer.png` });
await pagina.getByRole("button", { name: "Desfazer" }).click();
await esperarAviso(/^Desfeito\.$/);
await pagina.waitForLoadState("networkidle"); await pagina.waitForTimeout(700);
ok("desfazer concluir: voltaram para A Fazer", (await colunaDe(t1)) === "A Fazer" && (await colunaDe(t2)) === "A Fazer", `${await colunaDe(t1)} / ${await colunaDe(t2)}`);

console.log("passo: concluir e desfazer feitos");
// Alterar status
await marcar(t1); await marcar(t2);
await pagina.getByRole("button", { name: "Alterar status…" }).click();
await pagina.getByRole("menuitem").first().waitFor();
const itensStatus = await pagina.getByRole("menuitem").allTextContents();
ok("painel de status: marca a conclusão", itensStatus.some((t) => t.includes("· conclusão")), JSON.stringify(itensStatus));
ok("painel de status: 'já estão aqui' na coluna de origem", itensStatus.some((t) => t.includes("A Fazer") && t.includes("2 já estão aqui")), JSON.stringify(itensStatus));
await pagina.screenshot({ path: `${FOTOS}-4-painel-status.png` });
await pagina.getByRole("menuitem", { name: /^Fazendo/ }).click();
await esperarAviso(/agora estão em/);
const avisoStatus = await pagina.getByText(/agora estão em/).first().textContent();
ok("status: a frase segue o botão (sem 'movida')", !/movid/i.test(avisoStatus ?? ""), avisoStatus);
await pagina.waitForLoadState("networkidle"); await pagina.waitForTimeout(500);
ok("status: foram para Fazendo", (await colunaDe(t1)) === "Fazendo", await colunaDe(t1));
await pagina.getByRole("button", { name: "Desfazer" }).click();
await esperarAviso(/^Desfeito\.$/);
await pagina.waitForLoadState("networkidle"); await pagina.waitForTimeout(700);
ok("desfazer status: voltaram para A Fazer", (await colunaDe(t1)) === "A Fazer", await colunaDe(t1));

console.log("passo: status feito");
// Atribuir
await marcar(t1); await marcar(t2);
await pagina.getByRole("button", { name: "Atribuir a…" }).click();
await pagina.getByRole("menuitem").first().waitFor();
await pagina.waitForTimeout(600);
const itensPessoas = await pagina.getByRole("menuitem").allTextContents();
ok("painel de pessoas: diz quem é membro de todos", itensPessoas.some((t) => t.includes("Membro de todos os subgrupos da seleção")), JSON.stringify(itensPessoas.slice(0, 4)));
ok("painel de pessoas: oferece devolver ao pool", itensPessoas.some((t) => t.includes("Ninguém — devolver ao pool")));
await pagina.screenshot({ path: `${FOTOS}-5-painel-pessoas.png` });
await pagina.getByRole("menuitem").filter({ hasText: "Membro de todos os subgrupos da seleção" }).first().click();
await esperarAviso(/atribuídas? a /);
ok("atribuir: aviso com DESFAZER", (await pagina.getByRole("button", { name: "Desfazer" }).count()) === 1);
await pagina.getByRole("button", { name: "Desfazer" }).click();
await esperarAviso(/^Desfeito\.$/);
await pagina.getByRole("button", { name: "Cancelar", exact: true }).click();

console.log("passo: atribuir feito");
// ---------------------------------------------------------------- Agenda
await pagina.goto(`${APP}/agenda`);
await pagina.getByRole("heading", { name: "Agenda" }).waitFor();
await pagina.waitForLoadState("networkidle");
/* ⚠️ A Agenda abre "Por mês": "Próximos 14 dias" só aparece DEPOIS de entrar no
   modo, que troca a visão para lista. Esperar por ele antes do clique travava
   o roteiro. E o "Selecionar" só existe com tarefa na tela. */
const entrarNaAgenda = pagina.getByRole("button", { name: "Selecionar", exact: true });
await entrarNaAgenda.waitFor();
await entrarNaAgenda.click();
await pagina.getByText(/Próximos 14 dias/).first().waitFor();
/* ⚠️ Espera um número MAIOR que zero no link, como uma pessoa espera a lista
   aparecer. Entrar no modo recarrega o período, e antes a barra oferecia
   "Selecionar todas as 0" nesse intervalo -- defeito achado por esta mesma
   conferência, e corrigido na barra. */
const todas = pagina.getByRole("button", { name: /Selecionar todas as [1-9]\d*/ });
await todas.waitFor();
await todas.click();
/* ⚠️ A primeira versão aferia a trava 300ms depois do clique, sem esperar a
   seleção registrar -- e com ZERO marcadas o botão trava por "Selecione
   alguma tarefa". O "ok" da trava era falso, e a falha do motivo também. */
const contagem = pagina.getByText(/^[1-9]\d* de \d+ selecionadas$/).first();
await contagem.waitFor({ timeout: 8000 });
ok("Agenda: 'Selecionar todas' registrou a seleção", true, await contagem.textContent());
const status = pagina.getByRole("button", { name: "Alterar status…" });
const motivo = await pagina.getByText(/A seleção cruza \d+ subgrupos/).count();
ok("Agenda: seleção cruzada TRAVA 'Alterar status…'", await status.isDisabled());
ok("Agenda: e o motivo aparece À VISTA", motivo >= 1);
const barraAgenda = await medirBarra();
ok("Agenda: a barra não transborda", barraAgenda && !barraAgenda.transborda, JSON.stringify(barraAgenda));
await pagina.screenshot({ path: `${FOTOS}-6-agenda-trava.png` });

console.log("passo: agenda feita");
// ---------------------------------------------------- Área de trabalho
await pagina.goto(APP);
await pagina.waitForLoadState("networkidle");
await pagina.waitForTimeout(600);
try {
  const selecionar = pagina.getByRole("button", { name: "Selecionar", exact: true });
  if (await selecionar.count()) {
    await selecionar.last().click();
    await pagina.waitForTimeout(300);
    /* ⚠️ O `role=checkbox` é o input escondido de 1px: o controle desenhado fica
       por cima e toma o clique -- foi o que travou a primeira versão deste passo.
       Clica-se no rótulo, que é o alvo real da caixa. */
    const rotulo = pagina.locator('label[aria-label^="Selecionar "]').first();
    if (await rotulo.count()) {
      await rotulo.scrollIntoViewIfNeeded();
      await rotulo.click();
    }
    await pagina.waitForTimeout(300);
    const barraTrabalho = await medirBarra();
    ok("Área de trabalho: a barra de 5 botões não transborda o card", barraTrabalho && !barraTrabalho.transborda, JSON.stringify(barraTrabalho));
    await pagina.screenshot({ path: `${FOTOS}-7-trabalho-barra.png`, fullPage: true });
  } else {
    ok("Área de trabalho: havia 'Selecionar' para medir a barra", false, "nenhuma entrada visível");
  }
} catch (e) {
  /* Registra e segue: um passo que falha não pode esconder o veredito dos outros. */
  ok("Área de trabalho: medir a barra", false, String(e).split("\n")[0].slice(0, 160));
}

ok("sem erro de página", erros.length === 0, erros.slice(0, 2).join(" | "));
console.log("\n--- veredito ---");
for (const [nome, passou, det] of veredito) console.log(`${passou ? "ok    " : "FALHOU"}  ${nome}${!passou && det ? "  -> " + det : ""}`);
console.log(`\nfotos em ${FOTOS}-*.png`);
await pagina.waitForTimeout(1200);
await navegador.close();
