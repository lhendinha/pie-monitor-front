/** A conferência ponta a ponta das ações em lote, em PRODUÇÃO, num grupo de teste.
 *
 *   ESTADO=/caminho/fase10.json node scripts/conferir-acoes-em-lote-em-producao.mjs 1b 2
 *
 * O grupo é montado ANTES, pela API, e apagado DEPOIS por
 * `api/scripts/apagar_grupo_de_conferencia.py`. Cada passo roda sozinho: os
 * passos escrevem, e refazer um não pode obrigar a refazer os outros.
 *
 * 🔴 Age pela TELA e confere pela API: a tela dizer "concluídas" não prova que
 * o servidor concluiu.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 10.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const APP = "https://argos-monitor.vercel.app";
const API = "https://6onytielawp7g5fniczhomhhta0qlszl.lambda-url.sa-east-1.on.aws";
const FOTOS = "/tmp/fase10";
const E = JSON.parse(readFileSync(process.env.ESTADO, "utf8"));
const PASSOS = process.argv.slice(2);

const veredito = [];
const ok = (nome, cond, det = "") => { veredito.push([nome, Boolean(cond), det]); };
const erros = [];

// ------------------------------------------------------------------- API
const tokens = {};
async function token(email) {
  if (!tokens[email]) {
    const r = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: E.senha }) });
    tokens[email] = (await r.json()).access_token;
  }
  return tokens[email];
}
async function api(caminho, email = E.ana) {
  const r = await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${await token(email)}` } });
  return { status: r.status, corpo: await r.json().catch(() => ({})) };
}
const T = (titulo) => E.tarefas[titulo];
async function tarefa(titulo) {
  const t = T(titulo);
  return api(`/subgrupos/${t.subgrupo_id}/tarefas/${t.tarefa_id}`);
}
const quadros = {};
async function colunaDe(titulo) {
  const { status, corpo } = await tarefa(titulo);
  if (status !== 200) return `HTTP ${status}`;
  if (!quadros[corpo.subgrupo_id]) quadros[corpo.subgrupo_id] = (await api(`/subgrupos/${corpo.subgrupo_id}/quadro`)).corpo.colunas;
  return quadros[corpo.subgrupo_id].find((c) => c.coluna_id === corpo.coluna_id)?.nome ?? "?";
}
const sinoDo = async (email) => (await api("/notificacoes", email)).corpo.notificacoes ?? [];

// ------------------------------------------------------------------ tela
const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 25 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
const X = await contexto.newPage();
X.on("pageerror", (e) => erros.push(String(e)));

await X.goto(APP);
await X.getByLabel(/e-?mail/i).fill(E.ana);
await X.getByRole("textbox", { name: "Senha" }).fill(E.senha);
await X.getByRole("button", { name: /entrar/i }).click();
await X.waitForLoadState("networkidle");

const foto = (pagina, nome) => pagina.screenshot({ path: `${FOTOS}-${nome}.png` }).catch(() => {});
/** ⚠️ Pelo `[data-tipo]` do Aviso, e não pelo texto solto: o painel de pessoas
 * diz "1 ficará de fora" com as mesmas palavras, e a primeira versão leu o
 * painel achando que era o aviso. */
const aviso = async (pagina, re) => {
  const l = pagina.locator("[data-tipo]").filter({ hasText: re }).first();
  await l.waitFor({ timeout: 12000 });
  return (await l.textContent())?.trim();
};
/** Marca o card pelo título e devolve um locator dentro dele. */
async function card(pagina, titulo) {
  await pagina.getByText(titulo, { exact: true }).first().waitFor({ timeout: 15000 });
  const id = `card-${titulo.replace(/\W+/g, "-")}`;
  await pagina.evaluate(([t, marca]) => {
    const alvo = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent?.trim() === t);
    let no = alvo;
    while (no && !(no.querySelectorAll?.('label[aria-label^="Selecionar "], button').length > 1 && no.getBoundingClientRect().height > 150)) no = no.parentElement;
    no?.setAttribute("data-conferencia", marca);
  }, [titulo, id]);
  return pagina.locator(`[data-conferencia="${id}"]`);
}
const rotulo = (escopo, titulo) => escopo.locator(`label[aria-label="Selecionar ${titulo}"]`);
async function irParaTrabalho(pagina) {
  await pagina.goto(APP);
  await pagina.getByRole("heading", { name: "Área de trabalho" }).waitFor();
  await pagina.waitForLoadState("networkidle");
  await pagina.waitForTimeout(800);
}
async function numeroDoResumo(pagina, rotuloDoResumo) {
  return pagina.evaluate((r) => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent?.trim() === r);
    const linha = el?.parentElement;
    const n = linha?.textContent?.replace(r, "").match(/\d+/);
    return n ? Number(n[0]) : null;
  }, rotuloDoResumo);
}

async function passo(nome, corpo) {
  if (!PASSOS.includes(nome)) return;
  console.log(`\n== passo ${nome} ==`);
  try { await corpo(); } catch (e) {
    ok(`passo ${nome} terminou sem exceção`, false, String(e).split("\n")[0].slice(0, 220));
    await foto(X, `${nome}-falha`);
  }
}

// ---------------------------------------------------------------- passos
await passo("1b", async () => {
  await X.goto(`${APP}/processos/${E.s3}/${E.processo}`);
  await X.getByRole("tab", { name: "Tarefas" }).or(X.getByRole("button", { name: "Tarefas", exact: true })).first().click();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(800);
  ok("1b: antes da exclusão, a aba Tarefas do processo mostra 'zz Calcular custas'",
    (await X.getByText("zz Calcular custas").count()) > 0);
  await foto(X, "1b-processo-antes");
});

await passo("2", async () => {
  await irParaTrabalho(X);
  const antes = await numeroDoResumo(X, "Tarefas sem responsável");
  const minhas = await card(X, "Minhas tarefas");
  const disponiveis = await card(X, "Disponíveis para assumir");
  ok("2: duas entradas 'Selecionar' na tela", (await X.getByRole("button", { name: "Selecionar", exact: true }).count()) === 2);

  await minhas.getByRole("button", { name: "Selecionar", exact: true }).click();
  await X.waitForTimeout(400);
  const entradasComMinhas = await X.getByRole("button", { name: "Selecionar", exact: true }).count();
  const minhasMarcaveis = await minhas.locator('label[aria-label^="Selecionar "]').count();
  console.log(`medido: com Minhas no modo, entradas 'Selecionar' restantes = ${entradasComMinhas}; caixas em Minhas = ${minhasMarcaveis}`);
  await foto(X, "2a-minhas-no-modo");
  if (entradasComMinhas > 0) {
    await disponiveis.getByRole("button", { name: "Selecionar", exact: true }).click();
  } else {
    await X.getByRole("button", { name: "Cancelar", exact: true }).click();
    await X.waitForTimeout(300);
    await disponiveis.getByRole("button", { name: "Selecionar", exact: true }).click();
  }
  await X.waitForTimeout(400);
  ok("2: o outro card (Minhas) SAIU do modo", (await minhas.locator('label[aria-label^="Selecionar "]').count()) === 0);

  const ordem = await disponiveis.locator('label[aria-label^="Selecionar "]').evaluateAll((ls) => ls.map((l) => l.getAttribute("aria-label").replace("Selecionar ", "")));
  console.log("ordem visível em Disponíveis:", JSON.stringify(ordem));
  const i = ordem.indexOf("zz Calcular custas");
  const alvo = ordem.slice(i, i + 3);
  await rotulo(disponiveis, alvo[0]).click();
  await rotulo(disponiveis, alvo[2]).click({ modifiers: ["Shift"] });
  await X.waitForTimeout(400);
  const contagem = await X.getByText(/^\d+ de \d+ selecionadas?$/).first().textContent();
  ok("2: Shift+clique marcou o intervalo de 3", /^3 de /.test(contagem ?? ""), `${contagem} | ${JSON.stringify(alvo)}`);
  await foto(X, "2b-intervalo");

  await X.getByRole("button", { name: "Excluir 3", exact: true }).click();
  const dialogo = X.getByRole("dialog");
  await dialogo.waitFor();
  ok("2: a confirmação lista as tarefas", alvo.every((t) => false) || (await dialogo.getByRole("list").count()) === 1);
  await dialogo.getByRole("button", { name: /^Excluir 3 tarefas/ }).click();
  const frase = await aviso(X, /excluída/);
  console.log("aviso:", frase);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1500);
  const depois = await numeroDoResumo(X, "Tarefas sem responsável");
  ok("2: 'Tarefas sem responsável' encolheu 3 junto com a lista", antes !== null && depois === antes - 3, `${antes} -> ${depois}`);
  for (const t of alvo) {
    ok(`2: '${t}' sumiu do card`, (await disponiveis.getByText(t, { exact: true }).count()) === 0);
    ok(`2: '${t}' não existe mais no servidor`, (await tarefa(t)).status === 404);
  }
  await foto(X, "2c-depois");
});

/** Uma rodada da invariante: a outra aba ASSUME uma das marcadas, e só
 * então esta aba age. A assumida tem de sobreviver e voltar em recusadas. */
async function rodada(nome, marcada, assumida, agir, conferir) {
  await irParaTrabalho(X);
  const disp = await card(X, "Disponíveis para assumir");
  await disp.getByRole("button", { name: "Selecionar", exact: true }).click();
  await rotulo(disp, marcada).click();
  await rotulo(disp, assumida).click();
  await X.waitForTimeout(300);

  const Y = await contexto.newPage();
  Y.on("pageerror", (e) => erros.push(String(e)));
  await irParaTrabalho(Y);
  await Y.getByRole("button", { name: `Assumir ${assumida}` }).click();
  for (let i = 0; i < 20; i += 1) {
    if ((await tarefa(assumida)).corpo.responsavel_id === E.ana) break;
    await Y.waitForTimeout(500);
  }
  ok(`3/${nome}: a outra aba assumiu '${assumida}'`, (await tarefa(assumida)).corpo.responsavel_id === E.ana);

  await X.bringToFront();
  await X.waitForTimeout(1500);
  const naTela = await rotulo(disp, assumida).count();
  const contagem = await X.getByText(/^\d+ de \d+ selecionadas?$/).first().textContent().catch(() => "?");
  console.log(`medido (${nome}): de volta à aba, a assumida segue na tela = ${naTela}; barra = ${contagem}`);

  const frase = await agir();
  console.log(`aviso (${nome}):`, frase);
  await foto(X, `3-${nome}`);
  ok(`3/${nome}: a assumida voltou em RECUSADAS, com a frase`, (frase ?? "").includes("o responsável mudou enquanto você escolhia"), frase);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(800);
  await conferir();
  const b = (await tarefa(assumida)).corpo;
  ok(`3/${nome}: a assumida ficou intacta no servidor`, b.responsavel_id === E.ana && (await colunaDe(assumida)) === "A Fazer",
    `${b.responsavel_id} | ${await colunaDe(assumida)}`);
  await Y.close();
}

await passo("3", async () => {
  await rodada("concluir", "zz Arquivar cópias", "zz Conferir guias", async () => {
    await X.getByRole("button", { name: "Concluir", exact: true }).click();
    const d = X.getByRole("dialog"); await d.waitFor();
    await d.getByRole("button", { name: /^Concluir \d/ }).click();
    return aviso(X, /o responsável mudou|concluída/);
  }, async () => {
    ok("3/concluir: a outra foi concluída no servidor", (await colunaDe("zz Arquivar cópias")) === "Concluído", await colunaDe("zz Arquivar cópias"));
    await X.getByRole("button", { name: "Desfazer" }).click();
    await aviso(X, /^Desfeito\.$/);
    await X.waitForLoadState("networkidle"); await X.waitForTimeout(800);
    ok("3/concluir: o Desfazer a devolveu para A Fazer", (await colunaDe("zz Arquivar cópias")) === "A Fazer", await colunaDe("zz Arquivar cópias"));
  });
  await rodada("status", "zz Arquivar cópias", "zz Revisar minuta", async () => {
    await X.getByRole("button", { name: "Alterar status…" }).click();
    await X.getByRole("menuitem", { name: /^Fazendo/ }).click();
    return aviso(X, /o responsável mudou|agora est/);
  }, async () => {
    ok("3/status: a outra foi para Fazendo no servidor", (await colunaDe("zz Arquivar cópias")) === "Fazendo", await colunaDe("zz Arquivar cópias"));
  });
  await rodada("atribuir", "zz Arquivar cópias", "zz Digitalizar autos", async () => {
    await X.getByRole("button", { name: "Atribuir a…" }).click();
    await X.getByRole("menuitem").first().waitFor();
    await X.waitForTimeout(800);
    await X.getByRole("menuitem").filter({ hasText: "Bruno Conferência" }).first().click();
    return aviso(X, /o responsável mudou|atribuída/);
  }, async () => {
    ok("3/atribuir: a outra ficou com o Bruno no servidor", (await tarefa("zz Arquivar cópias")).corpo.responsavel_id === E.bruno);
  });
});

await passo("4", async () => {
  await irParaTrabalho(X);
  const minhas = await card(X, "Minhas tarefas");
  await minhas.getByRole("button", { name: "Selecionar", exact: true }).click();
  await rotulo(minhas, "zz Protocolar contestação").click();
  await rotulo(minhas, "zz Analisar sentença").click();
  await X.getByRole("button", { name: "Atribuir a…" }).click();
  await X.getByRole("menuitem").first().waitFor();
  await X.waitForTimeout(900);
  const itens = await X.getByRole("menuitem").allTextContents();
  const doBruno = itens.find((t) => t.includes("Bruno Conferência"));
  ok("4: o painel avisa, ANTES, que 1 ficará de fora", /1 ficará de fora/.test(doBruno ?? ""), doBruno);
  await foto(X, "4a-painel");
  await X.getByRole("menuitem").filter({ hasText: "Bruno Conferência" }).first().click();
  const frase = await aviso(X, /de fora|atribuída/);
  console.log("aviso (4):", frase);
  ok("4: a frase diz ONDE: 'não é membro de Lote Dois'", (frase ?? "").includes("não é membro de Lote Dois"), frase);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(800);
  ok("4: a do Lote Três foi para o Bruno no servidor", (await tarefa("zz Protocolar contestação")).corpo.responsavel_id === E.bruno);
  ok("4: a do Lote Dois ficou com a Ana (impedida)", (await tarefa("zz Analisar sentença")).corpo.responsavel_id === E.ana);
  await foto(X, "4b-aviso");
  // 6a: desfazer logo depois de atribuir
  await X.getByRole("button", { name: "Desfazer" }).click();
  await aviso(X, /^Desfeito\.$/);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(800);
  ok("6a: o Desfazer devolveu a atribuída à Ana", (await tarefa("zz Protocolar contestação")).corpo.responsavel_id === E.ana);
});

await passo("5", async () => {
  const sinoBrunoAntes = await sinoDo(E.bruno);
  const sinoAnaAntes = await sinoDo(E.ana);
  await X.goto(`${APP}/agenda`);
  await X.getByRole("heading", { name: "Agenda" }).waitFor();
  await X.waitForLoadState("networkidle");
  await X.getByRole("button", { name: "Selecionar", exact: true }).click();
  await X.getByText(/Próximos 14 dias/).first().waitFor();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1200);
  const alvo = ["zz Preparar audiência", "zz Redigir recurso", "zz Revisar contrato"];
  for (const t of alvo) await X.locator(`label[aria-label="Selecionar ${t}"]`).first().click();
  await X.getByRole("button", { name: "Concluir", exact: true }).click();
  const d = X.getByRole("dialog"); await d.waitFor();
  await d.getByRole("button", { name: /^Concluir 3/ }).click();
  const frase = await aviso(X, /concluída/);
  console.log("aviso (5):", frase);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(2000);
  await foto(X, "5-agenda-concluir");
  for (const t of alvo) {
    ok(`5: '${t}' foi para a conclusão do quadro DELA`, (await colunaDe(t)) === "Concluído", await colunaDe(t));
  }
  const sinoBruno = await sinoDo(E.bruno);
  const novasBruno = sinoBruno.filter((n) => !sinoBrunoAntes.some((a) => a.notificacao_id === n.notificacao_id));
  ok("5: o sino do Bruno ganhou UMA linha pelas duas tarefas", novasBruno.length === 1,
    JSON.stringify(novasBruno.map((n) => [n.tipo, n.titulo, n.detalhe])));
  const novasAna = (await sinoDo(E.ana)).filter((n) => !sinoAnaAntes.some((a) => a.notificacao_id === n.notificacao_id));
  ok("5: o sino de quem agiu (Ana) não ganhou nada", novasAna.length === 0, JSON.stringify(novasAna.map((n) => n.tipo)));
  // 6b: desfazer logo depois de concluir
  await X.getByRole("button", { name: "Desfazer" }).click();
  await aviso(X, /^Desfeito\.$/);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1500);
  for (const t of alvo) {
    ok(`6b: '${t}' voltou para A Fazer`, (await colunaDe(t)) === "A Fazer", await colunaDe(t));
  }
  const aposDesfazer = (await sinoDo(E.bruno)).filter((n) => !sinoBruno.some((a) => a.notificacao_id === n.notificacao_id));
  console.log("medido: o Desfazer somou ao sino do Bruno", JSON.stringify(aposDesfazer.map((n) => [n.tipo, n.titulo, n.detalhe])));
});

await passo("7", async () => {
  /* ⚠️ `tamanho_pagina` até 100: a primeira versão pediu 200, levou 422, e leu
     a lista vazia do erro como "zero sem responsável". */
  const { status: st, corpo } = await api("/tarefas?sem_responsavel=true&apenas_abertas=true&tamanho_pagina=50");
  if (st !== 200) throw new Error(`a contagem pela API respondeu ${st}: ${JSON.stringify(corpo)}`);
  const esperado = corpo.total;
  console.log("medido pela API: abertas sem responsável =", esperado, JSON.stringify((corpo.tarefas ?? []).map((t) => t.titulo)));
  await X.goto(`${APP}/agenda`);
  await X.getByRole("heading", { name: "Agenda" }).waitFor();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(800);
  await X.getByText("Todas as pessoas", { exact: true }).first().click();
  await X.getByRole("option", { name: "Sem responsável" }).click();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1000);
  await X.getByRole("button", { name: "Selecionar", exact: true }).click();
  const todas = X.getByRole("button", { name: /Selecionar todas as [1-9]\d*/ });
  await todas.waitFor({ timeout: 15000 });
  const n = Number(((await todas.textContent()) ?? "").match(/\d+/)[0]);
  const linhas = await X.locator('label[aria-label^="Selecionar "]').count();
  await todas.click();
  const contagem = X.getByText(/^[1-9]\d* de \d+ selecionadas?$/).first();
  await contagem.waitFor({ timeout: 8000 });
  const texto = (await contagem.textContent()) ?? "";
  ok("7: 'Selecionar todas' anuncia o total do FILTRO", n === esperado, `link ${n} | API ${esperado} | linhas na tela ${linhas}`);
  ok("7: e marca todas", texto.startsWith(`${n} de ${n}`), texto);
  await foto(X, "7-agenda-sem-responsavel");
  await X.getByRole("button", { name: "Cancelar", exact: true }).click();
});

await passo("8", async () => {
  await X.goto(`${APP}/kanban`);
  await X.getByRole("heading", { name: "Gestão kanban" }).waitFor();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1000);
  if ((await X.getByText("zz Juntar procuração", { exact: true }).count()) === 0) {
    for (const nome of ["Acervo sem membros", "Lote Dois", "Lote Três", "Lote Um"]) {
      const pilula = X.getByText(nome, { exact: true }).first();
      if (await pilula.count()) { await pilula.click(); break; }
    }
    await X.getByPlaceholder("Buscar subgrupo").fill("Lote Três");
    await X.waitForTimeout(800);
    await X.getByRole("option", { name: "Lote Três", exact: true }).first().click();
    await X.waitForLoadState("networkidle"); await X.waitForTimeout(1000);
  }
  await X.getByText("zz Juntar procuração", { exact: true }).first().waitFor({ timeout: 15000 });
  await X.getByRole("button", { name: "Selecionar", exact: true }).click();
  await X.waitForTimeout(400);

  const origem = await X.getByText("zz Juntar procuração", { exact: true }).first().boundingBox();
  const destino = await X.getByText("Fazendo", { exact: true }).first().boundingBox();
  await X.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2);
  await X.mouse.down();
  await X.mouse.move(origem.x + origem.width / 2 + 12, origem.y + origem.height / 2, { steps: 4 });
  await X.mouse.move(destino.x + destino.width / 2, destino.y + 80, { steps: 20 });
  await X.mouse.up();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1500);
  ok("8: no modo, arrastar NÃO move o cartão no servidor", (await colunaDe("zz Juntar procuração")) === "A Fazer", await colunaDe("zz Juntar procuração"));
  const aposArrastar = (await X.getByText(/^\d+ de \d+ selecionadas?$/).first().textContent()) ?? "";
  console.log("medido: a barra depois da tentativa de arrastar =", aposArrastar);
  if (!aposArrastar.startsWith("0 de")) {
    await X.getByText("zz Juntar procuração", { exact: true }).first().click();
    await X.waitForTimeout(300);
  }

  for (const t of ["zz Tarefa que o Bruno passou", "zz Ligar para o cliente"]) {
    await X.getByText(t, { exact: true }).first().click();
    await X.waitForTimeout(250);
  }
  await X.getByRole("button", { name: "Excluir 2", exact: true }).click();
  const d = X.getByRole("dialog"); await d.waitFor();
  await d.getByRole("button", { name: /^Excluir 2 tarefas/ }).click();
  await aviso(X, /excluídas/);
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1000);
  for (const t of ["zz Tarefa que o Bruno passou", "zz Ligar para o cliente"]) {
    ok(`8: '${t}' não existe mais no servidor`, (await tarefa(t)).status === 404);
  }
  ok("8: e a de fora da seleção continua lá", (await tarefa("zz Juntar procuração")).status === 200);
  await foto(X, "8-kanban");
});

await passo("9", async () => {
  await irParaTrabalho(X);
  await X.getByRole("button", { name: "Notificações" }).click();
  await X.getByText("zz Tarefa que o Bruno passou").first().click();
  const msg = await aviso(X, /Não foi possível abrir a tarefa do link/);
  ok("9: a notificação da tarefa apagada avisa", Boolean(msg), msg);
  await X.getByRole("heading", { name: "Gestão kanban" }).waitFor();
  ok("9: e o quadro continua utilizável", await X.getByRole("button", { name: "Nova tarefa" }).isVisible());
  await foto(X, "9a-sino");
  await X.goto(`${APP}/processos/${E.s3}/${E.processo}`);
  await X.getByRole("tab", { name: "Tarefas" }).or(X.getByRole("button", { name: "Tarefas", exact: true })).first().click();
  await X.waitForLoadState("networkidle"); await X.waitForTimeout(1000);
  ok("9: o processo que tinha tarefa apagada diz 'nenhuma'", (await X.getByText("Nenhuma tarefa vinculada a este processo.").count()) > 0);
  ok("9: sem aviso de erro na tela", (await X.locator('[data-tipo="erro"]').count()) === 0);
  await foto(X, "9b-processo");
});

ok("sem erro de página", erros.length === 0, erros.slice(0, 2).join(" | "));
await navegador.close();
let falhas = 0;
for (const [nome, passou, det] of veredito) {
  if (!passou) falhas += 1;
  console.log(`  ${passou ? "ok  " : "FALHOU"} ${nome}${det && !passou ? ` -- ${det}` : det ? ` (${det})` : ""}`);
}
console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
