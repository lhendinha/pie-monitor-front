/** As cores de status, MEDIDAS no DOM que o Chrome renderizou.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_abas.py
 *      .venv/bin/python scripts/offline/semear_documentos.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-cores.mjs
 *
 * 🔴 **`src/theme/contraste.test.ts` não substitui isto, e a razão tem nome.**
 * Aquele teste afirma que `warnDark` sobre `warnTint` dá 4,80:1 -- e é
 * verdade. O que ele NÃO alcança é se o componente na tela está mesmo usando
 * `warnDark`.
 *
 * Foi exatamente o que aconteceu em 26/08/2026: `status.warn.text` apontava
 * pra `{colors.warn.dark}`, que não existia na camada de tokens crus (só o
 * `bad` tinha `dark`). A referência não resolveu, a cor caiu pro herdado, e a
 * etiqueta "Em andamento" saiu com texto em `ink` sobre o âmbar. **Passava em
 * contraste** -- 14,81:1 -- e parecia plausível na tela. Nenhum teste de
 * unidade pegaria: o token estava certo, o componente estava certo, e a
 * ligação entre os dois é que estava rompida.
 *
 * Por isso a régua aqui é a cor COMPUTADA, e não o contraste: contraste bom
 * com a cor errada é o defeito que este script existe pra pegar.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

/** O que cada token vale, em rgb -- é assim que o `getComputedStyle` devolve. */
const ESPERADO = {
  warnDark: "rgb(153, 93, 0)", // #995d00
  warnTint: "rgb(253, 241, 222)", // #fdf1de
  brandDarker: "rgb(0, 79, 122)", // #004f7a
  brandTint: "rgb(232, 245, 252)", // #e8f5fc
  goodDark: "rgb(22, 121, 83)", // #167953
  badDark: "rgb(185, 58, 68)", // #b93a44
};

const luz = (c) => {
  const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const razao = (a, b) => {
  const [la, lb] = [luz(a), luz(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1440, height: 950 } })
).newPage();

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "  ok  " : "FALHA "} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

/** Mede um elemento e afirma a cor do TEXTO, o fundo e o contraste.
 *
 * A cor é comparada por igualdade: "escureceu um pouco" não serve, porque
 * herdar o `ink` também escurece -- e foi assim que o defeito passou. */
async function medir(locator, nome, corEsperada, fundoEsperado) {
  const m = await locator.evaluate((e) => {
    const s = getComputedStyle(e);
    return { cor: s.color, fundo: s.backgroundColor, tamanho: s.fontSize, peso: s.fontWeight };
  });
  const r = razao(m.cor, m.fundo);
  const detalhe = `${m.cor} sobre ${m.fundo} · ${m.tamanho}/${m.peso} · ${r.toFixed(2)}:1`;
  conferir(m.cor === corEsperada, `${nome}: a cor do TEXTO é a do token`, detalhe);
  if (fundoEsperado) conferir(m.fundo === fundoEsperado, `${nome}: o fundo é o tint certo`);
  // 4,5:1 -- todos estes são texto pequeno (11px a 13,5px).
  conferir(r >= 4.5, `${nome}: passa em AA pra texto pequeno`);
}

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();
console.log("entrou\n");

console.log("— etiqueta de status do atendimento (26/08/2026: âmbar e azul) —");
await pagina.goto(APP + "/atendimentos");
await pagina.getByText("Em andamento").first().waitFor({ timeout: 15_000 });
await medir(
  pagina.getByText("Em andamento", { exact: true }).first(),
  "Em andamento",
  ESPERADO.warnDark,
  ESPERADO.warnTint,
);
await medir(
  pagina.getByText("Fechado", { exact: true }).first(),
  "Fechado",
  ESPERADO.brandDarker,
  ESPERADO.brandTint,
);

console.log("\n— etiqueta de prazo (a metade que tinha ficado pra trás) —");
/* ⚠️ Pelo LINK DO LEMBRETE, não por `/kanban` seco.
   O quadro abre no primeiro subgrupo da lista ("Civel g-alfa"), e as tarefas
   de `semear_abas.py` vivem no "Resumo" -- o script procurava a etiqueta num
   quadro vazio. `/tarefas/:subgrupoId/:tarefaId` é o caminho que o e-mail de
   prazo já usa, e ele abre o quadro DO SUBGRUPO da tarefa. */
await pagina.goto(APP + "/tarefas/3bc2708f19ca/t-aba-hoje");
await pagina.getByText("Contestação vence hoje").first().waitFor({ timeout: 15_000 });
// O link abre o modal da tarefa por cima; a etiqueta que interessa é a do
// cartão, atrás dele.
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(500);

/* ⚠️ Pelo TAMANHO, não pelo texto. A Agenda tem um botão "Hoje" de
   navegação, e `getByText("Hoje")` pegava ele -- 13px/700, sem fundo,
   1,27:1 -- e o script acusava um defeito que era dele mesmo. A
   `EtiquetaDePrazo` é a única coisa 11px/800 com esse texto. */
const etiquetas = await pagina.locator("span").filter({ hasText: /^Hoje$/ }).all();
let medida = false;
for (const e of etiquetas) {
  if ((await e.evaluate((n) => getComputedStyle(n).fontSize)) === "11px") {
    await medir(e, "prazo Hoje", ESPERADO.warnDark, ESPERADO.warnTint);
    medida = true;
    break;
  }
}
/* 🔴 FALHA se não achou, em vez de imprimir "nada a medir" e seguir verde.
   `semear_abas.py` cria uma tarefa com prazo hoje justamente pra esta
   medição -- se ela sumir, o certo é o script gritar, não silenciar. */
conferir(medida, "prazo Hoje: a etiqueta existe pra ser medida");

console.log("\n— faixa de aviso (os DOIS tons estavam em 3:1) —");
await pagina.goto(APP + "/documentos");
await pagina.getByText("peticao-inicial-assinada.pdf").waitFor({ timeout: 15_000 });
await pagina.getByText("peticao-inicial-assinada.pdf").click();
await pagina.getByRole("button", { name: /Excluir/ }).click();
const faixa = pagina.getByText(/não pode ser recuperado/);
await faixa.waitFor();
await medir(faixa, "faixa de aviso", ESPERADO.warnDark);

console.log("\n" + "─".repeat(60));
const falhas = checagens.filter((c) => !c.ok);
console.log(`${checagens.length - falhas.length}/${checagens.length} checagens passaram`);
await navegador.close();
process.exit(falhas.length ? 1 : 0);
