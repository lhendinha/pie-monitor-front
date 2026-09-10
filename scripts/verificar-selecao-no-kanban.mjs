/** A seleção em lote no Kanban, com ARRASTE DE VERDADE em Chrome.
 *
 *   1) cd ../api && yarn offline   (esperar "Server ready")
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-selecao-no-kanban.mjs
 *
 * 🔴 É o único lugar onde a asserção da Fase 5 pode existir: em jsdom o
 * dnd-kit não arrasta, então "com o modo ligado o cartão não se move" passa
 * verde com o `disabled` do `useSortable` removido. Aqui o mouse desce, anda
 * e sobe -- e o par (fora do modo, move) é o que impede este script de
 * virar um "passou" que não prova nada.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 5.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
const FOTOS = "/tmp/kanban-selecao";
/** Qual quadro abrir. O padrão é o primeiro da lista, que na base local tem
 *  dois cartões -- suficiente para o par do arraste, pouco para ver desenho.
 *  `QUADRO="Cível" node scripts/...` abre um cheio. */
const QUADRO = process.env.QUADRO;

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
const pagina = await contexto.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e)));
const respostas = [];
contexto.on("response", (r) => r.status() >= 400 && respostas.push(`${r.status()} ${r.url()}`));

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForLoadState("networkidle");
console.log("1/6  entrou");

await pagina.goto(`${APP}/kanban`);
await pagina.getByRole("heading", { name: "Gestão kanban" }).waitFor();
await pagina.waitForLoadState("networkidle");
await pagina.waitForTimeout(600);

if (QUADRO) {
  /* ⚠️ A pílula lista só a PRIMEIRA PÁGINA: com 64 subgrupos na base local,
     o desejado quase nunca está nela. Digitar é o caminho -- é a busca do
     servidor, a mesma que a pessoa usa. */
  await pagina.getByText("A Filtro", { exact: true }).first().click();
  await pagina.getByPlaceholder("Buscar subgrupo").fill(QUADRO);
  await pagina.waitForTimeout(700);
  await pagina.getByRole("option", { name: QUADRO, exact: true }).first().click();
  await pagina.waitForLoadState("networkidle");
  await pagina.waitForTimeout(800);
  console.log(`     quadro trocado para "${QUADRO}"`);
}

/** O quadro como a tela o mostra: cada coluna e os TÍTULOS dos seus cartões.
 *
 * ⚠️ O cartão se acha pelo papel (`role="button"` fora do modo, `<label>` da
 * caixa dentro dele), nunca pela ordem dos `<p>`: o segundo `<p>` da coluna é
 * o CONTADOR do cabeçalho, e a primeira versão deste script arrastou o número
 * "1" achando que era um cartão -- e concluiu que o arraste não funcionava. */
const mapa = async () =>
  pagina.evaluate(() => {
    const colunas = [...document.querySelectorAll("div")].filter(
      (d) => d.className && getComputedStyle(d).flexBasis === "300px",
    );
    return colunas.map((c) => ({
      nome: c.querySelector("p")?.textContent?.trim() ?? "?",
      cartoes: [...c.querySelectorAll('[role="button"], label[data-part="root"]')]
        .map((n) => n.querySelector("p")?.textContent?.trim())
        .filter(Boolean),
    }));
  });

const antes = await mapa();
const primeira = antes[0];
const titulo = primeira?.cartoes?.[0];
console.log(`2/6  quadro: ${antes.map((c) => `${c.nome}(${c.cartoes.length})`).join(" | ")}`);
if (!titulo) {
  console.log("SEM CARTÃO na primeira coluna -- semeie o offline antes.");
  await navegador.close();
  process.exit(1);
}

/** Arrasta o cartão `titulo` para o meio da coluna de índice `destino`. */
async function arrastar(titulo, destino) {
  const cartao = pagina.getByText(titulo, { exact: true }).first();
  const alvo = await pagina.evaluateHandle((i) => {
    const colunas = [...document.querySelectorAll("div")].filter(
      (d) => d.className && getComputedStyle(d).flexBasis === "300px",
    );
    return colunas[i];
  }, destino);
  const de = await cartao.boundingBox();
  const para = await alvo.asElement().boundingBox();
  await pagina.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await pagina.mouse.down();
  /* Passos pequenos: o PointerSensor só vira arraste depois de 4px, e um
     salto único não gera os eventos intermediários que o dnd-kit escuta. */
  for (let i = 1; i <= 12; i++) {
    await pagina.mouse.move(
      de.x + (para.x + para.width / 2 - de.x) * (i / 12),
      de.y + (para.y + 80 - de.y) * (i / 12),
    );
    await pagina.waitForTimeout(25);
  }
  await pagina.mouse.up();
  await pagina.waitForTimeout(900);
}

/* --- 1) FORA do modo: o arraste move. É o par que dá sentido ao teste. --- */
await arrastar(titulo, 1);
const depoisDoArrasteLivre = await mapa();
const moveuLivre = !depoisDoArrasteLivre[0].cartoes.includes(titulo);
console.log(`3/6  fora do modo, "${titulo}" moveu: ${moveuLivre}`);
await pagina.screenshot({ path: `${FOTOS}-1-arraste-livre.png` });

/* Devolve o cartão para a coluna de origem, para o segundo caso partir do
   mesmo lugar. */
if (moveuLivre) {
  await arrastar(titulo, 0);
  await pagina.waitForTimeout(400);
}

/* --- 2) EM seleção: o arraste NÃO move. --- */
await pagina.getByRole("button", { name: "Selecionar", exact: true }).click();
await pagina.waitForTimeout(400);
const nota = await pagina.getByText(/arraste fica desligado/).count();
console.log(`4/6  modo ligado -- a barra avisa do arraste: ${nota > 0}`);
await pagina.screenshot({ path: `${FOTOS}-2-modo.png` });

const antesDoArrastePreso = await mapa();
await arrastar(titulo, 1);
const depoisDoArrastePreso = await mapa();
const ficouParado =
  JSON.stringify(antesDoArrastePreso) === JSON.stringify(depoisDoArrastePreso);
console.log(`5/6  em seleção, o quadro ficou igual: ${ficouParado}`);

/* --- 3) e o clique que seria arraste MARCA, em vez de não fazer nada. --- */
const marcadas = await pagina.getByText(/de \d+ selecionadas/).first().textContent();
await pagina.getByText(titulo, { exact: true }).first().click();
await pagina.waitForTimeout(300);
const depoisDoClique = await pagina.getByText(/de \d+ selecionadas/).first().textContent();
await pagina.screenshot({ path: `${FOTOS}-3-marcado.png` });
console.log(`6/6  clique no cartão: "${marcadas.trim()}" -> "${depoisDoClique.trim()}"`);

const transbordo = await pagina.evaluate(() => ({
  documento: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
}));

console.log("\n--- veredito ---");
console.log(`fora do modo o arraste MOVE.... ${moveuLivre ? "ok" : "FALHOU: o par não vale nada"}`);
console.log(`em seleção o arraste NÃO move.. ${ficouParado ? "ok" : "FALHOU: o cartão andou"}`);
console.log(`a barra avisa do arraste....... ${nota > 0 ? "ok" : "FALHOU"}`);
console.log(`o clique marca................. ${depoisDoClique !== marcadas ? "ok" : "FALHOU: nada marcou"}`);
console.log(`sem transbordo horizontal...... ${transbordo.documento ? "FALHOU" : "ok"}`);
console.log(`sem erro de página............. ${erros.length ? "FALHOU: " + erros[0] : "ok"}`);
console.log(`respostas >= 400............... ${respostas.length ? "FALHOU: " + [...new Set(respostas)].join(", ") : "ok"}`);
console.log(`\nfotos em ${FOTOS}-*.png`);

await pagina.waitForTimeout(1500);
await navegador.close();
