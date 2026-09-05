/** Os dois filtros novos do Histórico, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) .venv/bin/python scripts/offline/semear_historico.py   -- na pasta api
 *   3) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174 --strictPort
 *   4) node scripts/verificar-filtros-do-historico.mjs
 *
 * 🔴 Por que Chrome e não jsdom: o chip de subgrupo é um `FiltroDeMenu` do
 * Chakra, e esta base já registrou o caso em que o jsdom clicava no input
 * escondido enquanto o mouse acertava outro elemento -- o teste passava e a
 * tela não funcionava. O que só o navegador prova é que **clicar filtra**.
 *
 * ⚠️ O cenário exige dois números de processo E dois subgrupos com envios
 * diferentes: com um só de cada, uma tela que IGNORA o filtro dá o mesmo
 * resultado de uma que o respeita, e o roteiro passaria sem provar nada.
 *
 * ⚠️ O lembrete de tarefa entra de propósito. Ele grava `TAREFA#{id}` na
 * chave de partição (o DynamoDB recusa string vazia), e o filtro por número
 * não pode oferecê-lo como se fosse processo.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

/** O cenário semeado. */
const PROCESSO_A = "10004766920184013801"; // 3 envios
const SUBGRUPO = "Cível"; // 3 envios (2 no A, 1 lembrete)

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 40 });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1500, height: 980 } })
).newPage();

const problemas = [];
pagina.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
pagina.on("response", (r) => {
  const p = new URL(r.url()).pathname;
  if (r.status() >= 400 && !p.includes("favicon")) problemas.push(`${r.status()} ${p}`);
});

const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

async function entrar() {
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.getByLabel(/e-mail/i).fill(CONTA.email);
  // ⚠️ Por ROLE: `getByLabel(/senha/i)` casa também com "Mostrar senha".
  await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
}

/** O que a PRÓPRIA TELA declara: "Mostrando X de Y".
 *
 * 🔴 Contar `tbody tr` já rendeu falso ✅ nesta base. A frase da tela é o
 * número que a pessoa vê.
 *
 * 🔴 **Aqui o Y NÃO é o filtrado**, e isso é diferente de Atendimentos e
 * Documentos: no Histórico o "de Y" é o `totalSemFiltro` -- uma consulta
 * separada, sem filtro nenhum, que existe justamente pra a tela poder dizer
 * "tem 28, seu filtro escondeu" e oferecer o caminho de volta. Quem filtra é
 * o X. A primeira versão deste roteiro comparou o Y e leu "28 -> 28" como
 * "o filtro não funciona", quando o Y é constante POR DESENHO.
 *
 * ⚠️ E o X é o TOTAL filtrado, não o tamanho da página: "Mostrando 27 de 28"
 * com 10 por página. Os dois números vêm de envelopes, nenhum é contagem de
 * elemento na tela. */
async function mostrando() {
  const texto = await pagina
    .getByText(/^Mostrando \d+ de /)
    .first()
    .innerText();
  const [, x, y] = texto.match(/Mostrando (\d+) de (\d+)/) || [];
  return { filtrados: Number(x), semFiltro: Number(y) };
}

/** Altura das linhas -- a régua de aceitação da etiqueta.
 *
 * 🔴 Uma etiqueta que quebre em duas fileiras estoura a altura uniforme, e é
 * por isso que o teto de dois nomes existe. */
async function alturasDasLinhas() {
  /* ⚠️ O Histórico NÃO é `<table>`: cada envio é um `Flex role="button"`
     dentro do `CartaoDeTabela`. `tbody tr` devolvia lista vazia -- e uma
     lista vazia passa em "todas as alturas são iguais" sem medir nada. */
  return pagina.$$eval('div[role="button"][tabindex="0"]', (linhas) =>
    linhas.map((l) => Math.round(l.getBoundingClientRect().height)),
  );
}

/** A "cara" do campo de busca: o que a pessoa vê ao comparar duas telas.
 *
 * 🔴 Existe porque o `aria-label` NÃO guarda isto. A primeira versão usava um
 * `Input size="sm"` cru -- mesmo rótulo, mesmo comportamento, todos os testes
 * passando -- e na barra ficava sem lupa, sem borda e visivelmente diferente
 * da busca de Processos, na mesma posição da mesma barra. Estilo se compara
 * medindo, e a régua é a OUTRA tela, não um valor que eu escreva aqui. */
async function caraDoCampo(rotulo) {
  return pagina.evaluate((r) => {
    const campo = document.querySelector(`input[aria-label="${r}"]`);
    if (!campo) return null;
    const e = getComputedStyle(campo);
    return {
      // a lupa mora no irmão anterior, em `position: absolute`
      temLupa: Boolean(campo.parentElement?.querySelector("svg")),
      borda: `${e.borderTopWidth} ${e.borderTopStyle} ${e.borderTopColor}`,
      raio: e.borderTopLeftRadius,
      fundo: e.backgroundColor,
      recuoDaEsquerda: e.paddingLeft,
      altura: Math.round(campo.getBoundingClientRect().height),
      /* 🔴 O TETO declarado, não a largura renderizada: o campo é `flex: 1`
         e encolhe conforme o que mais está na barra -- em Processos ele mede
         247px de 420px de teto. Guardar o renderizado faria o roteiro falhar
         no dia em que alguém acrescentasse um filtro, sem nada ter quebrado. */
      teto: getComputedStyle(campo.parentElement).maxWidth,
    };
  }, rotulo);
}

await entrar();

// ── A tela, sem filtro nenhum ────────────────────────────────────────────
await pagina.goto(`${APP}/historico`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);

// A tela abre em "Movimentações": o lembrete semeado NÃO conta aqui.
const semFiltro = await mostrando();
conferir(semFiltro.filtrados > 0, "há histórico para filtrar", `${semFiltro.filtrados} na página`);

// ── Filtro 1: o número do processo ───────────────────────────────────────
const campo = pagina.getByLabel("Buscar por número do processo");
conferir(await campo.isVisible().catch(() => false), "o campo de número aparece na barra");

const caraNoHistorico = await caraDoCampo("Buscar por número do processo");
conferir(caraNoHistorico?.temLupa === true, "o campo tem a lupa por dentro");

await campo.fill(PROCESSO_A);
await pagina.waitForTimeout(1200);

/* ⚠️ A altura se mede na lista FILTRADA pelo processo A, e não na tela de
   abertura: o volume do offline tem envios de outras sementes sem órgão nem
   tipo de comunicação (`semear_resumo.py`), que medem 98px contra os 118px
   dos completos -- diferença de CONTEÚDO, não da etiqueta. Os envios de A
   têm a mesma forma e etiquetas de dois subgrupos, que é o que se quer medir.

   ⚠️ A ÚLTIMA linha fica de fora, e não é conveniência: `ItemDeHistorico`
   tem `_last={{ borderBottomWidth: 0 }}`, então ela mede 1px a menos POR
   DESENHO. Medindo todas, o roteiro acusava "117, 118" como se a etiqueta
   tivesse estourado a altura -- e a linha com DUAS etiquetas media os mesmos
   118,28px das outras. */
const alturas = (await alturasDasLinhas()).slice(0, -1);
conferir(
  alturas.length > 1 && new Set(alturas).size === 1,
  "as linhas têm altura uniforme com a etiqueta de subgrupo",
  `${alturas.length} linhas, ${[...new Set(alturas)].join(", ")}px`,
);

const porNumero = await mostrando();
const urlNumero = new URL(pagina.url());
conferir(
  urlNumero.searchParams.get("processo") === PROCESSO_A,
  "o número vai para a URL",
  urlNumero.search,
);
/* 🔴 As DUAS pontas, e é o que separa "filtrou" de "quebrou":
   - `> 0`   -- ainda mostra os envios daquele processo;
   - `< antes` -- deixou os outros de fora. */
conferir(
  porNumero.filtrados > 0 && porNumero.filtrados < semFiltro.filtrados,
  "o número mostra os dele e esconde os outros",
  `${semFiltro.filtrados} -> ${porNumero.filtrados}`,
);

// 🔴 A queixa que abriu isto: o PEDAÇO do número, que é o que se decora.
await campo.fill("3802");
await pagina.waitForTimeout(1200);
const porPedaco = await mostrando();
conferir(
  porPedaco.filtrados > 0 && porPedaco.filtrados < semFiltro.filtrados,
  "buscar por um PEDAÇO do número acha (o fim do número, não os 20 dígitos)",
  `"3802" -> ${porPedaco.filtrados}`,
);

// ⚠️ E o número MASCARADO, que é como a tela e o e-mail o mostram: colar da
// própria tela tem de achar o mesmo que digitar os dígitos crus.
await campo.fill("5000123-45.2023.4.01.3802");
await pagina.waitForTimeout(1200);
const porMascarado = await mostrando();
await campo.fill(PROCESSO_A);
await pagina.waitForTimeout(1200);

// ⚠️ O F5: sem o estado na URL, o filtro morre no recarregamento.
await pagina.reload({ waitUntil: "networkidle" });
await pagina.waitForTimeout(1000);
const depoisDoF5 = await mostrando();
conferir(
  porMascarado.filtrados === porPedaco.filtrados,
  "colar o número MASCARADO acha o mesmo que os dígitos crus",
  `mascarado ${porMascarado.filtrados} = pedaço ${porPedaco.filtrados}`,
);

conferir(
  depoisDoF5.filtrados === porNumero.filtrados,
  "o filtro sobrevive ao F5",
  `${porNumero.filtrados} -> ${depoisDoF5.filtrados}`,
);

// ── O caminho de volta ───────────────────────────────────────────────────
await campo.fill("00000000000000000000");
await pagina.waitForTimeout(1200);
const botaoVoltar = pagina.getByRole("button", { name: "Ver todos os envios" });
conferir(
  await botaoVoltar.isVisible().catch(() => false),
  "número que não existe oferece o caminho de volta",
);
if (await botaoVoltar.isVisible().catch(() => false)) {
  await botaoVoltar.click();
  await pagina.waitForTimeout(1200);
  const limpo = await mostrando();
  const urlLimpa = new URL(pagina.url());
  /* 🔴 Compara com o total SEM FILTRO (o "de Y"), e não com o que a tela
     mostrava ao abrir. "Ver todos" derruba o TIPO junto -- a tela abre em
     "Movimentações" e o botão tem que ver todos, lembrete incluído. Esperar
     o número de abertura acusaria como defeito exatamente o que o botão
     promete: 27 movimentações -> 28 envios. */
  conferir(
    limpo.filtrados === limpo.semFiltro,
    "«Ver todos os envios» devolve a lista inteira, lembrete incluído",
    `${semFiltro.filtrados} (movimentações) -> ${limpo.filtrados} de ${limpo.semFiltro}`,
  );
  conferir(
    !urlLimpa.searchParams.get("processo") && !urlLimpa.searchParams.get("subgrupo"),
    "e limpa os dois filtros novos do endereço",
    urlLimpa.search || "(sem query)",
  );
}

// ── Filtro 2: o chip de subgrupo ─────────────────────────────────────────
const chip = pagina.getByText("Todos os subgrupos");
const chipVisivel = await chip.isVisible().catch(() => false);
conferir(chipVisivel, "o chip de subgrupo aparece com mais de um subgrupo");

if (chipVisivel) {
  // 🔴 O clique de verdade -- é isto que o jsdom não prova.
  await chip.click();
  const alvo = pagina.getByRole("menuitem", { name: SUBGRUPO });
  await alvo.waitFor({ timeout: 5000 });
  await alvo.click();
  await pagina.waitForTimeout(1200);

  const porSubgrupo = await mostrando();
  const urlSub = new URL(pagina.url());
  conferir(urlSub.searchParams.has("subgrupo"), "a escolha vai para a URL", urlSub.search);
  conferir(
    porSubgrupo.filtrados > 0 && porSubgrupo.filtrados < semFiltro.filtrados,
    `"${SUBGRUPO}" mostra os dele e esconde os outros`,
    `${semFiltro.filtrados} -> ${porSubgrupo.filtrados}`,
  );

  // ── Os dois JUNTOS: é o que a separação de rotas destravou ─────────────
  /* 🔴 Antes de 03/09/2026 o número era rota própria e mandava sozinho: pedir
     número + subgrupo devolvia o número e IGNORAVA o resto. */
  await campo.fill(PROCESSO_A);
  await pagina.waitForTimeout(1200);
  const juntos = await mostrando();
  conferir(
    juntos.filtrados > 0 && juntos.filtrados <= porSubgrupo.filtrados,
    "os dois filtros valem JUNTOS, e não um por vez",
    `subgrupo ${porSubgrupo.filtrados} + número -> ${juntos.filtrados}`,
  );
}

// ── A mesma caixa de Processos, medida lá e aqui ─────────────────────────
await pagina.goto(`${APP}/processos`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(900);
const caraEmProcessos = await caraDoCampo("Pesquisar processo por número, cliente ou apelido");
const iguais =
  caraNoHistorico &&
  caraEmProcessos &&
  /* ⚠️ A largura fica de FORA da comparação, e não por descuido: Processos
     usa 420px porque a busca dele cobre número, cliente e apelido; as demais
     telas usam o padrão de 340px do componente. É conferida abaixo, contra o
     padrão. */
  ["temLupa", "borda", "raio", "fundo", "recuoDaEsquerda", "altura"].every(
    (k) => caraNoHistorico[k] === caraEmProcessos[k],
  );
conferir(
  iguais,
  "o campo é o MESMO de Processos -- lupa, borda, fundo, recuo e altura",
  iguais
    ? `${caraNoHistorico.borda}, raio ${caraNoHistorico.raio}, ${caraNoHistorico.altura}px`
    : `histórico ${JSON.stringify(caraNoHistorico)} vs processos ${JSON.stringify(caraEmProcessos)}`,
);

conferir(
  caraNoHistorico?.teto === "340px",
  "e usa o teto PADRÃO do componente, não um valor avulso",
  `${caraNoHistorico?.teto} (Processos: ${caraEmProcessos?.teto}, que cobre número, cliente e apelido)`,
);

console.log(
  `\n${problemas.length ? "⚠️ " + problemas.join(" | ") : "sem erro de página nem 4xx/5xx"}`,
);
const falhas = checagens.filter((c) => !c.ok).length;
console.log(falhas ? `\n❌ ${falhas} checagem(ns) falharam` : "\n✅ todas as checagens passaram");
await navegador.close();
process.exit(falhas ? 1 : 0);
