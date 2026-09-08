/** As telas de Clientes e Processos salvando e filtrando, contra a produção.
 *
 * 🔴 Existe pela Fase 3 do `PLANO_TRAVAS_E_TETOS.md`, que fechou duas coisas
 * que só a tela prova:
 *
 * - **O camelCase.** `clientes` é o módulo cujo formulário fala `cpfCnpj`, e
 *   quem traduz para `cpf_cnpj` é `services/api/clientes.ts`, antes de sair
 *   do navegador. Com a trava ligada, um tradutor que falhasse vira 422 na
 *   cara de quem está salvando -- e a suíte não pega, porque ela manda o
 *   corpo já traduzido.
 * - **O filtro repetível.** `?fase_id=a&fase_id=b` ganhou teto na LISTA (200
 *   itens) e por ITEM (128 caracteres). Um teto baixo demais recusaria em
 *   produção um filtro que a tela monta todo dia.
 *
 * ⚠️ Não cria nada: salva um cliente que já existe com os MESMOS valores. O
 * escritório de produção tem dado de verdade.
 *
 *     node scripts/verificar-acervo-em-producao.mjs
 */
import { APP, abrirProducaoLogado } from "./sessaoDeProducao.mjs";

/** Uma fase que existe no escritório de produção -- conferido em 08/09/2026
 *  por `GET /fases`. O roteiro só LÊ com ela; nada é criado nem alterado. */
const FASE_DE_TESTE = "fase-01";

const falhas = [];
const conferir = (rotulo, ok, detalhe = "") => {
  console.log(`  ${ok ? "ok " : "🔴 "}${rotulo}${detalhe ? `  ${detalhe}` : ""}`);
  if (!ok) falhas.push(rotulo);
};

const respostas = [];
const { navegador, pagina } = await abrirProducaoLogado({
  aoCriarPagina: (p) =>
    p.on("response", (r) =>
      respostas.push({
        metodo: r.request().method(),
        rota: new URL(r.url()).pathname + new URL(r.url()).search,
        status: r.status(),
      })),
});

/** Espera a PRÓXIMA resposta que casar -- nunca um toast, que sobrevive ao
 *  save anterior e volta na hora. */
async function esperar(casa) {
  const desde = respostas.length;
  for (let i = 0; i < 100; i++) {
    const achou = respostas.slice(desde).find(casa);
    if (achou) return achou;
    await pagina.waitForTimeout(200);
  }
  return null;
}

try {
  // ── Clientes: abrir um existente e salvar com os mesmos valores ────────
  await pagina.goto(`${APP}/clientes`);
  const linha = pagina.getByRole("row").nth(1);
  await linha.waitFor({ timeout: 20_000 });
  await linha.click();
  const salvar = pagina.getByRole("button", { name: /^salvar$/i });
  await salvar.waitFor({ timeout: 20_000 });
  await salvar.click();
  let r = await esperar((x) => x.metodo === "PATCH" && x.rota.startsWith("/clientes/"));
  conferir("salvar o cliente responde 200, e não 422 (o camelCase traduziu)",
           r?.status === 200, `${r?.rota} -> ${r?.status}`);

  // ── Processos: o filtro repetível, do jeito que uma pessoa o recebe ───
  /* ⚠️ Pelo LINK, e não clicando no multi-select. `?fase=<id>` é o formato
     que `useFiltrosProcessos` lê (`lerParametroDaUrl(params, "fase")`) -- é a
     URL que a tela escreve ao filtrar e que as pessoas colam umas para as
     outras. Ela exercita o mesmo caminho: o hook a traduz para o `?fase_id=`
     da API, que é onde os dois tetos desta fase moram. */
  await pagina.goto(`${APP}/processos`);
  await pagina.getByRole("row").nth(1).waitFor({ timeout: 20_000 });
  const rotulo = await pagina.locator("[class*='-control']")
    .filter({ hasText: "TODAS AS FASES" }).first().innerText();
  conferir("a tela de Processos traz o filtro de fase", rotulo.includes("FASES"));

  await pagina.goto(`${APP}/processos?fase=${FASE_DE_TESTE}`);
  const r2 = await esperar((x) => x.metodo === "GET" && x.rota.includes("fase_id="));
  conferir("um link com filtro de fase responde 200, e não 422",
           r2?.status === 200, `${(r2?.rota || "").slice(0, 60)} -> ${r2?.status}`);

  /* 🔴 O teto POR ITEM, pela mesma porta: 129 caracteres num `fase` da URL. É
     o caso que o plano chama de pior desfecho -- com o teto só na LISTA ele
     respondia 200 e o valor gigante seguia adiante. */
  await pagina.goto(`${APP}/processos?fase=${"z".repeat(129)}`);
  const r3 = await esperar((x) => x.metodo === "GET" && x.rota.includes("fase_id="));
  conferir("e um filtro de 129 caracteres é recusado com 422",
           r3?.status === 422, `-> ${r3?.status}`);

} finally {
  await navegador.close();
}

console.log(`\n${falhas.length} falha(s).`);
process.exit(falhas.length ? 1 : 0);
