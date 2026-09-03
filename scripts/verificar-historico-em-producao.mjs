/** Os dois filtros do Histórico, em PRODUÇÃO, em Chrome de verdade.
 *
 *     node scripts/verificar-historico-em-producao.mjs
 *
 * ⚠️ Reaproveita `sessaoDeProducao`: a conta de teste bloqueia em 5
 * tentativas, e este roteiro custa ZERO quando há sessão guardada.
 *
 * 🔴 O que ele confere é diferente do roteiro do offline. Lá o cenário é
 * semeado e as contagens são conhecidas; aqui o dado é o de produção e muda
 * sozinho, então toda asserção é RELATIVA -- "filtrar reduz e não zera",
 * "duas formas do mesmo número dão o mesmo resultado" -- e nenhuma é um
 * número fixo que amanhã vira falso alarme.
 */
import { abrirProducaoLogado, APP } from "./sessaoDeProducao.mjs";

const problemas = [];
const checagens = [];
const conferir = (ok, nome, detalhe = "") => {
  checagens.push({ ok, nome });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
};

const { navegador, pagina } = await abrirProducaoLogado({
  aoCriarPagina: (p) => {
    p.on("pageerror", (e) => problemas.push(`erro de página: ${e.message.slice(0, 140)}`));
    p.on("response", (r) => {
      const u = new URL(r.url());
      // ⚠️ Só a API: sem este recorte o predicado casava com a navegação do
      // próprio SPA e reportava a página HTML como se fosse a chamada.
      if (u.origin === APP) return;
      if (r.status() >= 400) problemas.push(`${r.status()} ${u.pathname}`);
    });
  },
});

/** "Mostrando X de Y" -- X é o total FILTRADO, Y o total sem filtro. */
async function mostrando() {
  const texto = await pagina
    .getByText(/^Mostrando \d+ de /)
    .first()
    .innerText();
  const [, x, y] = texto.match(/Mostrando (\d+) de (\d+)/) || [];
  return { filtrados: Number(x), semFiltro: Number(y) };
}

await pagina.goto(`${APP}/historico`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);

const abertura = await mostrando();
conferir(abertura.filtrados > 0, "o histórico de produção tem envios", `${abertura.filtrados}`);

// ── O campo, e a queixa que o trouxe ─────────────────────────────────────
const campo = pagina.getByLabel("Buscar por número do processo");
conferir(await campo.isVisible().catch(() => false), "o campo de busca está na barra");

/** O primeiro número da lista, como a TELA o mostra (mascarado). */
const mascaradoNaTela = (await pagina.locator("div[role='button'][tabindex='0']").first().innerText())
  .split("\n")[0]
  .trim();
const digitos = mascaradoNaTela.replace(/\D/g, "");
conferir(
  digitos.length === 20,
  "a tela mostra o número mascarado, e ele tem 20 dígitos",
  `${mascaradoNaTela} -> ${digitos}`,
);

// 🔴 O pedaço: os 4 últimos dígitos, que é o que se decora.
await campo.fill(digitos.slice(-4));
await pagina.waitForTimeout(1800);
const porPedaco = await mostrando();
conferir(
  porPedaco.filtrados > 0 && porPedaco.filtrados < porPedaco.semFiltro,
  "buscar pelo FIM do número acha, e não traz a lista inteira",
  `"${digitos.slice(-4)}" -> ${porPedaco.filtrados} de ${porPedaco.semFiltro}`,
);

// ⚠️ Colar o número como a TELA o mostra tem de achar o mesmo que os dígitos.
await campo.fill(mascaradoNaTela);
await pagina.waitForTimeout(1800);
const porMascara = await mostrando();
await campo.fill(digitos);
await pagina.waitForTimeout(1800);
const porCru = await mostrando();
conferir(
  porMascara.filtrados === porCru.filtrados && porCru.filtrados > 0,
  "colar o número MASCARADO acha o mesmo que os dígitos crus",
  `mascarado ${porMascara.filtrados} = cru ${porCru.filtrados}`,
);

// ⚠️ Par negativo: dígitos que não existem não podem trazer nada.
await campo.fill("99999999999999999999");
await pagina.waitForTimeout(1800);
const inexistente = await mostrando();
conferir(inexistente.filtrados === 0, "número que não existe devolve vazio");
conferir(
  await pagina.getByRole("button", { name: "Ver todos os envios" }).isVisible().catch(() => false),
  "e oferece o caminho de volta",
);

await pagina.getByRole("button", { name: "Ver todos os envios" }).click();
await pagina.waitForTimeout(1800);
const limpo = await mostrando();
conferir(
  limpo.filtrados === limpo.semFiltro,
  "«Ver todos os envios» devolve tudo -- inclusive os lembretes",
  `${limpo.filtrados} de ${limpo.semFiltro}`,
);

// ── A etiqueta na linha, que é o requisito do cliente ────────────────────
/* ⚠️ Medida ANTES do chip: com um filtro ligado a lista pode ficar vazia, e
   uma lista vazia passa em "todas as alturas são iguais" sem medir nada. */
const alturas = (
  await pagina.$$eval("div[role='button'][tabindex='0']", (ls) =>
    ls.map((l) => Math.round(l.getBoundingClientRect().height)),
  )
).slice(0, -1); // a última não tem borda inferior: mede 1px a menos por desenho
conferir(
  alturas.length > 1 && new Set(alturas).size === 1,
  "as linhas têm altura uniforme com a etiqueta de subgrupo",
  `${alturas.length} linhas, ${[...new Set(alturas)].join(", ")}px`,
);

// ── O chip de subgrupo ───────────────────────────────────────────────────
const chip = pagina.getByText("Todos os subgrupos");
const temChip = await chip.isVisible().catch(() => false);
if (temChip) {
  /* 🔴 O subgrupo escolhido é o que a PRÓPRIA LINHA declara na etiqueta, e
     não o primeiro do menu. A primeira versão pegava o primeiro e recebeu
     zero -- resposta legítima, porque produção tem 12 subgrupos para 27
     envios e a maioria não tem envio nenhum. Um roteiro que acusa isso como
     defeito treina a gente a ignorá-lo.

     E de quebra a checagem ficou mais forte: ela agora prova CONCORDÂNCIA --
     o filtro devolve o item cuja etiqueta diz pertencer àquele subgrupo. */
  const primeiraLinha = pagina.locator("div[role='button'][tabindex='0']").first();
  const etiqueta = (await primeiraLinha.innerText())
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && l === l.toUpperCase() && !/^\d|ENVIADO|FALHA/.test(l));

  if (!etiqueta) {
    conferir(false, "a primeira linha declara um subgrupo na etiqueta");
  } else {
    await chip.click();
    const alvo = pagina.getByRole("menuitem", { name: new RegExp(`^${etiqueta}$`, "i") });
    const achou = await alvo.count();
    conferir(achou > 0, `o subgrupo da etiqueta ("${etiqueta}") está no chip`);
    if (achou) {
      await alvo.first().click();
      await pagina.waitForTimeout(1800);
      const porSubgrupo = await mostrando();
      conferir(
        porSubgrupo.filtrados > 0,
        "o chip devolve o envio cuja etiqueta diz ser dele",
        `${etiqueta}: ${limpo.filtrados} -> ${porSubgrupo.filtrados}`,
      );
    }
  }
} else {
  /* ⚠️ NÃO é falha: a conta pode participar de um subgrupo só, e aí o chip
     some de propósito -- controle sem efeito é pior que controle nenhum. */
  conferir(true, "o chip não aparece (a conta tem um subgrupo só)", "esperado");
}

console.log(
  `\n${problemas.length ? "⚠️ " + problemas.join(" | ") : "sem erro de página nem 4xx/5xx"}`,
);
const falhas = checagens.filter((c) => !c.ok).length;
console.log(falhas ? `\n❌ ${falhas} checagem(ns) falharam` : "\n✅ todas as checagens passaram");
await navegador.close();
process.exit(falhas ? 1 : 0);
